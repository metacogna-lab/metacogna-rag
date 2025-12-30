# System Architecture

## Overview

Metacogna follows a modern serverless architecture built entirely on Cloudflare's edge network. This design provides global distribution, low latency, and automatic scaling without infrastructure management.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Vite React Application (SPA)                 │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │  │
│  │  │   Views    │  │  Services  │  │ Components │        │  │
│  │  └────────────┘  └────────────┘  └────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              │ HTTPS
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                    Cloudflare Edge Network                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Cloudflare Pages (Frontend)                  │  │
│  │  • Static asset hosting                                   │  │
│  │  • Automatic deployments from Git                         │  │
│  │  • Global CDN distribution                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Cloudflare Workers (Backend API)                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │  Auth   │  │  Ingest  │  │   Chat   │  │   R2     │  │  │
│  │  │  Routes │  │  Routes  │  │  Routes  │  │  Routes  │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────┬──────────────┬──────────────┬──────────────┬─────────────┘
       │              │              │              │
       │              │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  D1 Database│ │ Vectorize  │ │  R2 Storage│ │ Workers AI│
│  (SQLite)   │ │ (Vectors)  │ │  (Objects) │ │ (Inference)│
└─────────────┘ └────────────┘ └────────────┘ └────────────┘
```

## Component Breakdown

### Frontend Layer (Cloudflare Pages)

**Technology**: Vite + React + TypeScript

**Responsibilities**:
- User interface rendering
- Client-side routing
- State management
- API communication
- User interaction handling

**Key Characteristics**:
- Single Page Application (SPA)
- Static site generation
- Deployed via Git integration
- Global CDN distribution

### Backend Layer (Cloudflare Workers)

**Technology**: TypeScript/JavaScript on V8 runtime

**Responsibilities**:
- API endpoint handling
- Authentication and authorization
- Business logic orchestration
- Integration with Cloudflare services
- Request/response processing

**Key Characteristics**:
- Serverless functions
- Edge execution (runs close to users)
- Automatic scaling
- Pay-per-request pricing

### Storage Layer

#### D1 (Relational Database)
- **Type**: Serverless SQLite
- **Use Cases**: 
  - User accounts and authentication
  - Document metadata
  - Chat sessions and messages
  - Agent memory streams
  - Training data
- **Characteristics**: ACID transactions, SQL queries, 5GB free tier

#### Vectorize (Vector Database)
- **Type**: Native vector storage
- **Use Cases**:
  - Document embeddings
  - Semantic search
  - RAG context retrieval
- **Characteristics**: Cosine similarity, 768-dim vectors, 30M queried dimensions/month free

#### R2 (Object Storage)
- **Type**: S3-compatible object storage
- **Use Cases**:
  - Original document files (PDFs, text files)
  - Media assets
  - User uploads
- **Characteristics**: Zero egress fees, 10GB free tier, presigned URLs

### AI/ML Layer

#### Workers AI
- **Type**: Cloudflare's native AI inference
- **Use Cases**:
  - Text embeddings
  - LLM inference (optional)
- **Models**: BGE-base-en-v1.5 (embeddings)

#### External LLM Providers
- **OpenAI**: GPT-4o, GPT-4o Mini, GPT-5
- **Google**: Gemini 3 Flash, Gemini 3 Pro
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku

## Request Flow Examples

### Document Upload Flow

```
1. User selects file in UploadView
   ↓
2. Frontend calls R2Service.getUploadUrl()
   ↓
3. Worker generates presigned PUT URL
   ↓
4. Frontend uploads directly to R2
   ↓
5. Frontend calls /api/ingest with metadata
   ↓
6. Worker:
   - Stores metadata in D1
   - Reads file from R2
   - Chunks text
   - Generates embeddings (Workers AI)
   - Stores vectors in Vectorize
   - Extracts knowledge graph
   ↓
7. Response with document ID
```

### Chat Query Flow

```
1. User submits question in QuestionView
   ↓
2. Frontend calls RAGEngine.chat()
   ↓
3. Worker receives /api/chat request
   ↓
4. Worker:
   - Embeds query (Workers AI or external)
   - Searches Vectorize for similar chunks
   - Retrieves top-k relevant documents
   - Constructs context from chunks
   - Calls LLM (selected provider) with context
   - Stores message in D1
   ↓
5. Response with generated answer
   ↓
6. Frontend displays response
```

### Agent Processing Flow

```
1. User initiates agent simulation in AgentCanvasView
   ↓
2. Frontend calls AgentGraphService.processTurn()
   ↓
3. Service:
   - Retrieves memory from MemoryService
   - Constructs prompt with context
   - Calls LLMService with structured schema
   - Parses agent action (MERGE/EXPLODE/SHAKE/etc.)
   - Updates memory streams
   - Stores turn in D1
   ↓
4. Response with agent output
   ↓
5. Frontend updates UI with agent state
```

## Data Models

### Core Entities

**User**
- Authentication credentials
- Preferences and settings
- Profile information

**Document**
- Metadata (title, type, upload date)
- R2 storage key
- Processing status
- Knowledge graph nodes/edges

**Chat Session**
- Session metadata
- Associated messages
- LLM provider/model used

**Chat Message**
- Role (user/assistant)
- Content
- Timestamp
- Provider/model information

**Memory Stream**
- Stream ID
- Goal/context
- Frames (agent turns)
- Status (active/archived)

**Training Example**
- Input/output pairs
- Source (chat/agent/prompt)
- Model used
- Metadata

## Security Architecture

### Authentication
- Custom D1-based user authentication
- Password hashing (client-side before transmission)
- Session management via localStorage

### Data Privacy
- User data isolated per account
- No cross-user data leakage
- Secure API key storage (environment variables)

### API Security
- CORS configuration
- Request validation
- Error handling without exposing internals

## Scalability Considerations

### Horizontal Scaling
- Workers automatically scale to handle traffic
- D1 can handle millions of reads per day
- Vectorize scales with query volume

### Performance Optimizations
- Edge caching for static assets
- Vector search optimized for low latency
- Direct R2 uploads (no Worker proxy)
- Batch operations where possible

### Cost Management
- Free tier covers most development/testing
- Pay-per-use model for production
- Efficient resource utilization

## Monitoring & Observability

### Logging
- System logs via LogService
- Worker logs via Wrangler tail
- Frontend console logging

### Analytics (Optional)
- Langfuse integration for LLM observability
- Custom analytics events
- Error tracking

## Next Steps

- [Frontend Architecture](./02-frontend-architecture.md) - Detailed frontend structure
- [Backend Architecture](./03-backend-architecture.md) - Worker API design
- [Storage Architecture](./04-storage-architecture.md) - D1, R2, Vectorize details

