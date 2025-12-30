# Backend Architecture

## Overview

The Metacogna backend is built entirely on Cloudflare Workers, providing a serverless API that orchestrates interactions between the frontend and Cloudflare's storage and AI services.

## Technology Stack

- **Runtime**: Cloudflare Workers (V8 JavaScript engine)
- **Language**: TypeScript
- **Deployment**: Wrangler CLI
- **Storage**: D1, R2, Vectorize
- **AI**: Workers AI, External LLM APIs

## Worker Structure

```
worker/
└── src/
    ├── index.ts          # Main worker entry point
    └── wrangler.toml     # Worker configuration
```

## Core Worker (`index.ts`)

### Request Handling

The worker uses a simple routing pattern:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // Route handling...
  }
}
```

### Environment Interface

```typescript
interface Env {
  AI: any;                    // Workers AI binding
  VECTOR_INDEX: any;          // Vectorize index binding
  DB: any;                    // D1 database binding
  metacogna_vault: R2Bucket;  // R2 bucket binding
  OPENAI_API_KEY?: string;    // OpenAI API key
  GEMINI_API_KEY?: string;    // Google Gemini API key
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_HOST?: string;
}
```

## API Endpoints

### Authentication

**POST `/api/auth/login`**
- Authenticates user credentials
- Queries D1 for user record
- Returns user object on success

**POST `/api/auth/register`**
- Creates new user account
- Stores in D1 database
- Returns success/error status

### Document Ingestion

**POST `/api/ingest`**
- Receives document metadata and content
- Stores document metadata in D1
- Chunks text content
- Generates embeddings via Workers AI
- Stores vectors in Vectorize
- Extracts knowledge graph via LLM
- Returns document ID

**Flow**:
```
1. Receive { docId, title, content, metadata }
2. Store in D1: INSERT INTO documents
3. Chunk content (512 char chunks)
4. Generate embeddings: env.AI.run('@cf/baai/bge-base-en-v1.5')
5. Upsert vectors to Vectorize
6. Extract graph via LLM
7. Store graph in D1
8. Return success
```

### Chat

**POST `/api/chat`**
- Receives chat query with provider/model selection
- Embeds query (Workers AI or external)
- Searches Vectorize for relevant chunks
- Constructs context from retrieved documents
- Calls selected LLM provider
- Stores message and session in D1
- Returns generated response

**Request Body**:
```typescript
{
  query: string;
  sessionId?: string;
  provider: 'openai' | 'google' | 'workers-ai';
  model: string;
  apiKey?: string;  // Optional OpenAI key override
}
```

**Flow**:
```
1. Embed query
2. Vectorize.query() for top-k chunks
3. Retrieve document metadata from D1
4. Construct prompt with context
5. Call LLM (OpenAI/Google/Workers AI)
6. Store message in D1
7. Return response
```

### R2 Storage

**POST `/api/r2/upload-url`**
- Generates presigned PUT URL for direct upload
- Returns URL and key

**PUT `/api/r2/upload`**
- Direct upload endpoint (alternative to presigned)
- Stores file in R2 bucket

**GET `/api/r2/access-url`**
- Generates presigned GET URL for file access
- Returns temporary access URL

**GET `/api/r2/file`**
- Proxies file from R2
- Returns file content

**DELETE `/api/r2/file`**
- Deletes file from R2
- Updates D1 metadata

### D1 Database Operations

**GET `/api/documents`**
- Lists all documents
- Returns document metadata from D1

**GET `/api/documents/:id`**
- Retrieves specific document
- Returns full document data

## Response Format

### Success Response
```typescript
{
  success: true,
  data: { ... }
}
```

### Error Response
```typescript
{
  error: "Error message",
  details?: { ... }
}
```

## CORS Configuration

All endpoints include CORS headers:
```typescript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
```

## Error Handling

### Error Response Helper
```typescript
const errorResponse = (msg: string, status = 500) => 
  jsonResponse({ error: msg }, status);
```

### Try-Catch Pattern
All endpoints wrapped in try-catch:
- Catches errors gracefully
- Returns user-friendly error messages
- Logs errors for debugging

## Database Schema

### Tables (D1)

**users**
- `id`: TEXT PRIMARY KEY
- `username`: TEXT UNIQUE
- `passwordHash`: TEXT
- `createdAt`: INTEGER

**documents**
- `id`: TEXT PRIMARY KEY
- `title`: TEXT
- `content`: TEXT (truncated)
- `metadata`: TEXT (JSON)
- `r2Key`: TEXT (R2 object key)
- `createdAt`: INTEGER

**chat_sessions**
- `id`: TEXT PRIMARY KEY
- `title`: TEXT
- `createdAt`: INTEGER
- `updatedAt`: INTEGER

**chat_messages**
- `id`: TEXT PRIMARY KEY
- `sessionId`: TEXT
- `role`: TEXT ('user' | 'assistant')
- `content`: TEXT
- `provider`: TEXT
- `model`: TEXT
- `createdAt`: INTEGER

**memory_streams**
- `id`: TEXT PRIMARY KEY
- `streamId`: TEXT
- `goal`: TEXT
- `status`: TEXT
- `createdAt`: INTEGER

**training_examples**
- `id`: TEXT PRIMARY KEY
- `source`: TEXT
- `model_used`: TEXT
- `input`: TEXT (JSON)
- `output`: TEXT
- `metadata`: TEXT (JSON)
- `timestamp`: INTEGER

## Vectorize Integration

### Index Configuration
- **Dimensions**: 768 (BGE-base-en-v1.5)
- **Metric**: Cosine similarity
- **Binding**: `VECTOR_INDEX`

### Operations
- **Upsert**: Store document embeddings
- **Query**: Search for similar vectors
- **Metadata**: Store document context with vectors

## Workers AI Integration

### Embedding Model
- **Model**: `@cf/baai/bge-base-en-v1.5`
- **Dimensions**: 768
- **Usage**: Document and query embeddings

### LLM Models (Optional)
- Workers AI LLM models available
- Can be used as alternative to external providers

## External LLM Integration

### OpenAI
- Direct API calls to `https://api.openai.com/v1/chat/completions`
- Supports GPT-4o, GPT-4o Mini, GPT-5
- API key from environment or request

### Google Gemini
- Direct API calls to Google Generative AI
- Supports Gemini 3 Flash, Gemini 3 Pro
- API key from environment

## R2 Integration

### Bucket Configuration
- **Binding**: `metacogna_vault`
- **Bucket Name**: `metacogna-vault`
- **Access**: Presigned URLs for security

### Operations
- Generate presigned PUT URLs for uploads
- Generate presigned GET URLs for access
- Direct file operations (proxy mode)

## Observability (Optional)

### Langfuse Integration
- Tracks LLM calls
- Logs prompts and responses
- Performance metrics
- Configured via environment variables

## Security Considerations

### API Keys
- Stored as Worker secrets
- Can be overridden per request (OpenAI)
- Never exposed to frontend

### Authentication
- Password hashing (client-side)
- Session management
- User isolation in queries

### CORS
- Configured for frontend domain
- Allows necessary methods
- Headers properly set

## Performance Optimizations

### Edge Execution
- Workers run close to users
- Low latency responses
- Global distribution

### Efficient Queries
- Indexed database queries
- Vector search optimization
- Batch operations where possible

### Caching
- Static responses cached
- Vector results cached
- Reduced redundant calls

## Deployment

### Wrangler Configuration

```toml
name = "metacogna-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
routes = [{ pattern = "api.metacogna.ai/*", zone_name = "metacogna.ai" }]

[[d1_databases]]
binding = "DB"
database_name = "metacogna-db"
database_id = "..."

[[vectorize]]
binding = "VECTOR_INDEX"
index_name = "metacogna-index"

[[r2_buckets]]
binding = "metacogna_vault"
bucket_name = "metacogna-vault"
```

### Deployment Commands

```bash
bun wrangler deploy          # Deploy worker
bun wrangler tail            # View logs
bun wrangler d1 execute ...  # Run database queries
```

## Next Steps

- [Storage Architecture](./04-storage-architecture.md) - D1, R2, Vectorize details
- [API Reference](../development/02-api-reference.md) - Complete API documentation
- [Deployment Guide](../deployment/01-overview.md) - Deployment instructions

