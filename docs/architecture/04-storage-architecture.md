# Storage Architecture

## Overview

Metacogna uses three Cloudflare storage services to handle different data types: D1 for relational data, Vectorize for vector embeddings, and R2 for object storage.

## Storage Services

### D1 (Relational Database)

**Type**: Serverless SQLite  
**Use Case**: Structured data, metadata, relationships

#### Database Schema

**users**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);
```

**documents**
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  metadata TEXT,  -- JSON string
  r2Key TEXT,     -- R2 object key
  createdAt INTEGER NOT NULL
);
```

**chat_sessions**
```sql
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

**chat_messages**
```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' | 'assistant'
  content TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (sessionId) REFERENCES chat_sessions(id)
);
```

**memory_streams**
```sql
CREATE TABLE memory_streams (
  id TEXT PRIMARY KEY,
  streamId TEXT NOT NULL,
  goal TEXT,
  status TEXT,  -- 'active' | 'archived'
  createdAt INTEGER NOT NULL
);
```

**training_examples**
```sql
CREATE TABLE training_examples (
  id TEXT PRIMARY KEY,
  source TEXT,  -- 'rag_chat' | 'agent_simulation' | 'prompt_lab'
  model_used TEXT,
  input TEXT,   -- JSON string
  output TEXT,
  metadata TEXT,  -- JSON string
  timestamp INTEGER NOT NULL
);
```

#### Indexes

```sql
CREATE INDEX idx_documents_r2key ON documents(r2Key);
CREATE INDEX idx_chat_messages_session ON chat_messages(sessionId);
CREATE INDEX idx_memory_streams_stream ON memory_streams(streamId);
```

#### Operations

**Read Operations**
- User authentication queries
- Document metadata retrieval
- Chat history queries
- Memory stream lookups

**Write Operations**
- User registration
- Document metadata storage
- Chat message insertion
- Memory frame storage

**Query Patterns**
- Simple SELECT with WHERE
- JOIN operations for related data
- Aggregations for analytics
- Foreign key relationships

### Vectorize (Vector Database)

**Type**: Native vector storage  
**Use Case**: Semantic search, document embeddings

#### Index Configuration

```bash
wrangler vectorize create metacogna-index \
  --dimensions=768 \
  --metric=cosine
```

**Dimensions**: 768 (BGE-base-en-v1.5 embedding size)  
**Metric**: Cosine similarity  
**Binding**: `VECTOR_INDEX`

#### Vector Structure

```typescript
{
  id: string,              // Unique vector ID (e.g., "doc-123-chunk-0")
  values: number[768],    // Embedding vector
  metadata: {
    docId: string,
    title: string,
    content: string,       // Chunk text
    chunkIndex: number,
    ...otherMetadata
  }
}
```

#### Operations

**Upsert**
```typescript
await env.VECTOR_INDEX.upsert([
  {
    id: "doc-123-chunk-0",
    values: [0.1, 0.2, ...],
    metadata: { docId: "doc-123", content: "..." }
  }
]);
```

**Query**
```typescript
const results = await env.VECTOR_INDEX.query(
  queryVector,  // 768-dim array
  {
    topK: 5,
    returnMetadata: true
  }
);
```

**Use Cases**
- Document chunk storage
- Semantic search
- RAG context retrieval
- Similarity matching

### R2 (Object Storage)

**Type**: S3-compatible object storage  
**Use Case**: File storage, original documents

#### Bucket Configuration

**Bucket Name**: `metacogna-vault`  
**Binding**: `metacogna_vault`  
**Access**: Presigned URLs

#### Object Structure

**Key Pattern**: `{userId}/{docId}/{filename}`

**Example**: `user-123/doc-456/document.pdf`

#### Operations

**Presigned Upload URL**
```typescript
// Worker generates presigned PUT URL
const url = await env.metacogna_vault.createMultipartUpload({
  key: objectKey,
  httpMethod: 'PUT'
});
```

**Direct Upload**
```typescript
// Frontend uploads directly to R2
await fetch(presignedUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
});
```

**Presigned Access URL**
```typescript
// Worker generates presigned GET URL
const url = await env.metacogna_vault.getSignedUrl({
  key: objectKey,
  expiresIn: 3600  // 1 hour
});
```

**Direct Access (Proxy)**
```typescript
// Worker proxies file
const object = await env.metacogna_vault.get(objectKey);
return new Response(object.body, {
  headers: { 'Content-Type': object.httpMetadata?.contentType }
});
```

**Delete**
```typescript
await env.metacogna_vault.delete(objectKey);
```

## Data Flow Patterns

### Document Upload Flow

```
1. User selects file
   ↓
2. Frontend requests upload URL: POST /api/r2/upload-url
   ↓
3. Worker generates presigned PUT URL
   ↓
4. Frontend uploads directly to R2
   ↓
5. Frontend calls: POST /api/ingest
   ↓
6. Worker:
   - Reads file from R2 (or receives content)
   - Extracts text
   - Chunks content
   - Generates embeddings
   - Stores in Vectorize
   - Stores metadata in D1
   - Links r2Key in D1
```

### Chat Query Flow

```
1. User submits query
   ↓
2. Worker embeds query
   ↓
3. Worker queries Vectorize: top-k similar chunks
   ↓
4. Worker retrieves document metadata from D1
   ↓
5. Worker constructs context
   ↓
6. Worker calls LLM
   ↓
7. Worker stores message in D1
   ↓
8. Returns response
```

### Agent Memory Flow

```
1. Agent processes turn
   ↓
2. Service retrieves memory from D1
   ↓
3. Service constructs prompt with memory context
   ↓
4. Service calls LLM
   ↓
5. Service stores new frame in D1
   ↓
6. Service updates memory stream
```

## Storage Limits (Free Tier)

### D1
- **Storage**: 5GB
- **Reads**: 5 million rows/day
- **Writes**: 100,000 rows/day
- **Database Size**: Unlimited databases

### Vectorize
- **Queried Dimensions**: 30 million/month
- **Indexes**: Unlimited
- **Vectors**: Limited by queried dimensions

### R2
- **Storage**: 10GB
- **Class A Operations**: 1 million/month
- **Class B Operations**: 10 million/month
- **Egress**: Free (zero egress fees)

## Data Consistency

### Document Consistency
- D1 stores metadata and R2 key
- Vectorize stores embeddings
- R2 stores original file
- All three must be in sync

### Chat Consistency
- Sessions in `chat_sessions`
- Messages in `chat_messages`
- Foreign key relationships maintained

### Memory Consistency
- Streams in `memory_streams`
- Frames linked to streams
- Status updates atomic

## Backup and Recovery

### D1
- Automatic backups
- Point-in-time recovery
- Export/import via Wrangler

### Vectorize
- Index replication
- Export vectors (if needed)

### R2
- Versioning (optional)
- Lifecycle policies
- Cross-region replication (paid)

## Migration Strategy

### Schema Migrations
- SQL migration files in `db/migrations/`
- Run via Wrangler D1 execute
- Idempotent migrations

### Data Migration
- Export from old system
- Transform to new schema
- Import via Wrangler

## Performance Considerations

### D1
- Use indexes for frequent queries
- Batch operations where possible
- Avoid N+1 queries

### Vectorize
- Batch upserts
- Optimize top-k values
- Cache frequent queries

### R2
- Use presigned URLs for direct access
- Avoid proxying large files
- Set appropriate cache headers

## Security

### Access Control
- User-scoped data in D1
- Presigned URLs for R2
- No direct vector access

### Encryption
- Data encrypted at rest
- HTTPS in transit
- Secure API keys

## Monitoring

### Metrics
- D1 query performance
- Vectorize query latency
- R2 operation counts

### Logging
- Worker logs via Wrangler tail
- Error tracking
- Performance monitoring

## Next Steps

- [Database Schema](../development/02-api-reference.md#database-schema) - Complete schema reference
- [Deployment Setup](../deployment/02-storage-setup.md) - Storage configuration
- [Migration Guide](../deployment/02-storage-setup.md#migrations) - Database migrations

