
# Cloudflare Deployment & Storage Strategy

This document outlines the architectural plan for deploying Pratejra RAG to Cloudflare, replacing the local-only Docker infrastructure with a scalable, serverless, and mostly free-tier compatible stack.

## Architecture Overview

| Component | Local Dev Stack | Production Stack (Cloudflare) |
| :--- | :--- | :--- |
| **Frontend** | Vite Dev Server | **Cloudflare Pages** (Static hosting + Git CI/CD) |
| **Backend API** | (Simulated in Browser) | **Cloudflare Workers** (Serverless functions) |
| **Vector DB** | ChromaDB (Docker) | **Cloudflare Vectorize** (Native vector storage) |
| **Relational DB** | LocalStorage / Mock | **Cloudflare D1** (Serverless SQLite) |
| **File Storage** | Browser / Local Disk | **Cloudflare R2** (S3-compatible Object Storage) |
| **AI Inference** | Local Ollama | **Workers AI** (Serverless inference) or External APIs |

---

## 1. Vector Storage (Cloudflare Vectorize)

**Why:** Replaces ChromaDB. Native integration with Workers, extremely low latency, and free tier supports up to 100k queries/month.

**Implementation Plan:**
1.  **Create Index**:
    ```bash
    npx wrangler vectorize create pratejra-index --dimensions=768 --metric=cosine
    ```
2.  **Worker Integration**:
    *   Create a Worker `rag-service` to handle insertion and querying.
    *   Bind the index in `wrangler.toml`:
        ```toml
        [[vectorize]]
        binding = "VECTOR_INDEX"
        index_name = "pratejra-index"
        ```
3.  **Migration**:
    *   Update `services/RAGEngine.ts` to call this Worker endpoint instead of simulated local logic.

## 2. Relational Data (Cloudflare D1)

**Why:** Replaces `localStorage` for critical data (User profiles, Chat History, Settings, Agent Logs). SQL capabilities allow for complex queries on metadata.

**Schema Strategy:**
*   `users`: ID, Preferences (JSON).
*   `documents`: ID, Title, R2_Key, Metadata (JSON), Status.
*   `chat_sessions`: ID, Title, CreatedAt.
*   `chat_messages`: ID, SessionID, Role, Content.

**Implementation Plan:**
1.  **Create Database**:
    ```bash
    npx wrangler d1 create pratejra-db
    ```
2.  **Adapter**:
    *   Create a `D1Service` class in the frontend to interface with the Worker exposing D1 access.

## 3. File Storage (Cloudflare R2)

**Why:** Replaces local file handling. Zero egress fees, ideal for storing the raw PDFs/MD files uploaded by users.

**Implementation Plan:**
1.  **Create Bucket**:
    ```bash
    npx wrangler r2 bucket create pratejra-vault
    ```
2.  **Upload Flow**:
    *   Frontend generates a Signed URL request to a Worker.
    *   Worker returns a presigned PUT URL.
    *   Frontend uploads file directly to R2.

## 4. Backend Logic (Cloudflare Workers)

**Role**: Acts as the orchestration layer between the React frontend and the storage services.

**Worker Endpoints**:
*   `POST /api/ingest`: Receives text/file -> Embeds via Workers AI (or OpenAI/Google) -> Stores in Vectorize -> Stores metadata in D1.
*   `POST /api/chat`: Receives query -> Embeds -> Queries Vectorize -> Retrieves Context -> Calls LLM (External or Workers AI).
*   `GET /api/documents`: Lists files from D1.

## 5. Cost Analysis (Free Tier)

*   **Cloudflare Pages**: Unlimited sites, 500 builds/month (Free).
*   **Workers**: 100,000 requests/day (Free).
*   **Vectorize**: 30 million queried dimensions/month (~100k queries) (Free).
*   **D1**: 5GB storage, 5 million rows read/day (Free).
*   **R2**: 10GB storage, zero egress fees (Free).

**Fallback / Scale Strategy**:
*   If Vectorize limits are hit, fallback to **Supabase** (Free Tier: 500MB database, pgvector included).
*   If Heavy Compute is needed (e.g., local PDF parsing of massive files), use **AWS Lambda** triggered via API Gateway, keeping the rest on Cloudflare.

## 6. AWS Integration (Optional Backup)

If stricter data sovereignty or specific enterprise features are required:
*   **Storage**: Backup R2 buckets to **AWS S3 Glacier Deep Archive** for long-term compliance storage (extremely cheap).
*   **Compute**: Use **AWS Lambda** for specialized Python-based parsing tasks (e.g., `unstructured` library) that might not run on the V8-based Cloudflare Workers.
