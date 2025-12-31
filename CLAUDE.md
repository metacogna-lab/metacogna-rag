# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pratejra RAG** is a production-ready RAG (Retrieval-Augmented Generation) system with multi-agent orchestration, knowledge graph visualization, and observability. The application features:

- Multi-provider LLM support (Google Gemini, OpenAI, Anthropic, Ollama)
- Vector search with ChromaDB or Cloudflare Vectorize
- Multi-agent supervisor system with meta-learning
- Interactive knowledge graph visualization
- Session memory and context tracking
- LLM observability via Langfuse
- Dual deployment: Local (Docker) or Cloud (Cloudflare Workers)

## Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (dev server runs on port 3000)
- Tailwind CSS
- Framer Motion (animations)
- Lucide React (icons)

**AI/ML:**
- Google Generative AI (`@google/genai`) - Primary LLM provider
- ChromaDB - Local vector storage
- Cloudflare Workers AI - Cloud embeddings
- Langfuse - LLM observability and tracing

**Backend Options:**
- **Local**: ChromaDB (port 8000) + Ollama (port 11434) via Docker Compose
- **Cloud**: Cloudflare Workers + D1 (SQLite) + Vectorize

## Architecture

### Service Layer (`services/`)

The application follows a service-oriented architecture with these core services:

**RAGEngine.ts**
- Document ingestion and chunking (512 tokens, 50 overlap)
- Vector search and semantic retrieval
- Dual-mode: ChromaDB (local) or Cloudflare Worker API (cloud)
- Rate limiting: 10 RPM

**LLMService.ts**
- Multi-provider abstraction (Google, OpenAI, Anthropic, Ollama)
- Streaming response support
- Automatic retry logic (3 retries with exponential backoff)
- JSON schema support for structured outputs

**SupervisorService.ts**
- Autonomous session monitoring (45-second intervals)
- Meta-learning with policy persistence
- Profile completeness checking
- Decision logging and advice generation

**MemoryService.ts**
- Three-tier memory system (short/medium/long)
- Stream-based context management
- Automatic memory consolidation

**AgentGraphService.ts**
- Knowledge graph generation from documents
- D3-based force-directed graph visualization
- Entity and relationship extraction

**AuthService.ts**
- Local authentication with localStorage
- Session management
- User profile storage

**Observability.ts**
- Langfuse integration for LLM tracing
- Request/response logging
- Performance metrics

### View Layer (`views/`)

Single-page application with view-based routing:

- **LandingPageView** - Hero page with quick actions
- **UploadView** - Document upload and ingestion
- **QuestionView** - RAG chat interface with streaming
- **KnowledgeGraphView** - Interactive graph visualization
- **AgentCanvasView** - Multi-agent workflow builder
- **ProductXView** - ProductX configuration and management
- **MyProfileView** - User profile and summary generation
- **PromptGenView** - Prompt engineering laboratory
- **SettingsView** - LLM provider and vault configuration
- **ConsoleView** - System logs and training data export
- **AuthView** - Login/register interface

### Component Layer (`components/`)

Reusable UI components:
- **Layout** - Main application shell with navigation
- **GlobalAIModal** - Quick AI assistant (Cmd/Ctrl+I)
- **SupervisorWidget** - Real-time supervisor advice
- **ErrorBoundary** - React error boundary
- **GlobalToast** - Toast notifications
- **GraphAnalysis** - Graph metrics and insights
- **PaperComponents** - Shared paper-style UI elements

### Type System (`types.ts` + `schemas/`)

Types are organized into schema modules:
- `schemas/documents.ts` - Document and source types
- `schemas/chat.ts` - Chat message and conversation types
- `schemas/agents.ts` - Agent configuration and state
- `schemas/prompts.ts` - System prompts and templates
- `schemas/settings.ts` - App configuration and LLM settings

### Worker Layer (`worker/src/index.ts`)

Cloudflare Worker backend implementation:
- **Auth Routes** - `/api/auth/login` and `/api/auth/register` with D1 database
- **Ingest Route** - `/api/ingest` for document processing with Workers AI embeddings
- **Search Route** - `/api/search` for vector similarity search via Vectorize
- **Graph Route** - `/api/graph` for knowledge graph data retrieval
- **Bindings** - AI (Workers AI), VECTOR_INDEX (Vectorize), DB (D1 Database)
- **CORS** - Full CORS support for browser access

## Development Commands

### Always Use Bun

Per user requirements, **always use bun** instead of npm/yarn/pnpm:

```bash
# Install dependencies
bun install

# Development server (http://localhost:3000)
bun run dev

# Production build
bun run build

# Preview production build
bun run preview

# Run tests
bun test

# Linting
bun run lint
```

### Local Infrastructure (Docker)

```bash
# Start ChromaDB + Ollama
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker logs pratejra-rag-chromadb-1
docker logs pratejra-rag-ollama-1

# Pull Ollama models
docker exec -it pratejra-rag-ollama-1 ollama pull llama3.2
docker exec -it pratejra-rag-ollama-1 ollama pull mistral-nemo

# Verify Ollama
curl http://localhost:11434
```

### Cloudflare Workers (Cloud Deployment)

Three deployment methods available:

**Method 1: Automated Script (Recommended)**
```bash
# Authenticate first
bun wrangler login

# Full deployment
./deployment/deploy.sh --full

# Or step-by-step
./deployment/deploy.sh --setup        # Setup resources
./deployment/deploy.sh --worker-only  # Deploy worker
```

**Method 2: NPM Scripts**
```bash
bun run deploy:setup    # Create D1, Vectorize, init schema
# Update wrangler.toml with database_id from output
bun run deploy:full     # Build and deploy

# Individual scripts available:
bun run worker:dev      # Local worker dev server
bun run worker:deploy   # Deploy worker
bun run worker:tail     # Stream logs
bun run db:create       # Create D1 database
bun run db:init         # Initialize schema
bun run vector:create   # Create vector index
```

**Method 3: Manual Commands**
```bash
# See deployment/DEPLOYMENT.md for complete guide
bun wrangler d1 create pratejra-db
bun wrangler vectorize create pratejra-index --dimensions=768 --metric=cosine
bun wrangler d1 execute pratejra-db --file=db/schema.sql
bun wrangler secret put LANGFUSE_PUBLIC_KEY
bun wrangler secret put LANGFUSE_SECRET_KEY
bun wrangler deploy
```

## Key Configuration

### Environment Variables

Create `.env` file from `.env.example`:

```bash
# Required for local development
GEMINI_API_KEY=your_key_here

# Optional: Langfuse observability
LANGFUSE_HOST=https://cloud.langfuse.com
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

**Note**: Bun automatically loads `.env` files - no dotenv package needed.

### Wrangler Configuration

`wrangler.toml` defines Cloudflare Worker bindings:
- **AI**: Workers AI for embeddings/inference
- **VECTOR_INDEX**: Vectorize binding (`pratejra-index`)
- **DB**: D1 database binding (`pratejra-db`)

### Default Config (`constants.ts`)

```typescript
DEFAULT_CONFIG = {
  llm: {
    provider: 'google',
    model: 'gemini-3-flash-preview',
    temperature: 0.3,
    apiKeys: { google: process.env.GEMINI_API_KEY }
  },
  vaults: [{ id: 'v1', name: 'Local Vault', type: 'local' }]
}
```

## Architecture Patterns

### Dual-Mode RAG System

The RAG engine supports two deployment modes:

**Local Mode** (Development):
- ChromaDB running in Docker (port 8000)
- Direct HTTP API calls to ChromaDB
- Ollama for local LLM inference (port 11434)

**Cloud Mode** (Production):
- Cloudflare Workers API (`CONFIG.workerUrl = '/api'`)
- Vectorize for vector storage
- Workers AI for embeddings
- D1 for relational data

### Memory Tiers

The memory system uses three tiers:
- **Short**: Last 3 interactions
- **Medium**: Last 10 interactions with summarization
- **Long**: Persistent cross-session memory

### Supervisor Meta-Learning

The supervisor service:
1. Monitors sessions every 45 seconds
2. Analyzes conversation patterns
3. Generates strategic advice
4. Learns user preferences (stored in `localStorage`)
5. Checks profile completeness on app mount

### Streaming Responses

LLM responses stream via async generators:

```typescript
async *streamResponse(config, prompt, context): AsyncGenerator<string> {
  const stream = await model.generateContentStream(...);
  for await (const chunk of stream.stream) {
    yield chunk.text();
  }
}
```

### Knowledge Graph Generation

Graph generation pipeline:
1. Extract entities and relationships using LLM
2. Parse JSON response into nodes/links
3. Calculate node centrality (size = connection count)
4. Render with D3 force-directed layout

## Critical Implementation Details

### Rate Limiting

RAGEngine implements rate limiting:
```typescript
CONFIG.rateLimitRPM = 10;  // 10 requests per minute
minInterval = (60 * 1000) / CONFIG.rateLimitRPM;
```

### Chunking Strategy

Document chunking:
- Chunk size: 512 tokens
- Overlap: 50 tokens
- Preserves context across boundaries

### Error Handling

All services use consistent error handling:
- Try/catch with fallback responses
- Retry logic with exponential backoff (LLMService)
- User-friendly error messages via toast notifications
- Detailed logging to ConsoleView

### Observability

When Langfuse is configured:
- Every LLM request is traced
- Session context is captured
- Performance metrics are logged
- Training data is auto-collected

## Common Development Tasks

### Adding a New LLM Provider

1. Update `LLMProvider` type in `schemas/settings.ts`
2. Add provider case in `LLMService.generate()`
3. Add provider case in `LLMService.streamResponse()`
4. Update `PROVIDER_DEFAULT_MODELS` in `constants.ts`
5. Add API key field in `SettingsView.tsx`

### Adding a New View

1. Create view component in `views/`
2. Add view to `ViewState` enum in `types.ts`
3. Add route case in `App.tsx renderView()`
4. Add navigation option in `Layout.tsx`

### Modifying the Knowledge Graph

1. Update entity extraction prompt in `AgentGraphService.ts`
2. Adjust D3 force simulation parameters in `KnowledgeGraphView.tsx`
3. Modify node/link styling in graph rendering logic

### Adding Custom Agents

1. Define agent spec in `schemas/agents.ts`
2. Implement agent logic in `AgentCanvasView.tsx`
3. Update supervisor to monitor new agent type
4. Add agent to ProductX configuration if needed

## Testing

Current test setup uses Jest (defined in package.json):

```bash
# Run all tests
bun test

# Run specific test file
bun test __tests__/App.test.tsx
```

**Note**: Consider migrating to `bun:test` for better Bun integration:

```typescript
import { test, expect } from "bun:test";

test("service functionality", () => {
  expect(1).toBe(1);
});
```

## Deployment Targets

### Local Development

1. Start Docker services: `docker-compose up -d`
2. Create `.env` with `GEMINI_API_KEY`
3. Install: `bun install`
4. Run: `bun run dev`
5. Access: http://localhost:3000

### Cloudflare Pages (Frontend)

1. Build: `bun run build`
2. Deploy `dist/` to Cloudflare Pages
3. Set environment variable: `GEMINI_API_KEY`

### Cloudflare Workers (Backend)

1. Configure `wrangler.toml` with D1 database ID
2. Initialize D1: `bun wrangler d1 execute pratejra-db --file=db/schema.sql`
3. Create vector index: `bun wrangler vectorize create pratejra-index --dimensions=768 --metric=cosine`
4. Set secrets: `bun wrangler secret put LANGFUSE_PUBLIC_KEY`
5. Deploy: `bun wrangler deploy`

## Important Notes

- **Worker Implementation**: Fully implemented at `worker/src/index.ts` with auth, ingest, search, and graph endpoints
- **Database Schema**: Located at `db/schema.sql` with tables: users, documents, graph_nodes, graph_edges
- **ChromaDB CORS**: Requires `ANONYMIZED_TELEMETRY=FALSE` in docker-compose.yml
- **Ollama CORS**: Requires `OLLAMA_ORIGINS=*` in docker-compose.yml for browser access
- **Deployment Docs**: Complete guides in `deployment/` directory (DEPLOYMENT.md, CHECKLIST.md, README.md)

## Bun-Specific Patterns

When writing new backend code, prefer Bun APIs:

```typescript
// File I/O
const file = Bun.file("./data.json");
const content = await file.text();

// HTTP Server
Bun.serve({
  routes: {
    "/api/chat": {
      POST: async (req) => {
        return Response.json({ message: "ok" });
      }
    }
  }
});

// SQLite
import { Database } from "bun:sqlite";
const db = new Database("./db.sqlite");

// Environment
const apiKey = process.env.GEMINI_API_KEY; // Auto-loaded from .env
```

## Additional Resources

- Vite configuration: `vite.config.ts` (port 3000, Docker networking enabled)
- TypeScript config: `tsconfig.json` (ES2020, bundler mode, strict)
- Local deployment: `LOCAL_DEPLOYMENT.md` (Docker setup guide)
- Cloud deployment: `deployment/DEPLOYMENT.md` (complete Cloudflare Workers guide)
- Deployment checklist: `deployment/CHECKLIST.md` (quick reference)
- Deployment automation: `deployment/deploy.sh` (automated setup script)
- Worker configuration: `deployment/wrangler.md` (original config reference)
- Root meta-repo: `../CLAUDE.md` (contains multi-project guidance)
