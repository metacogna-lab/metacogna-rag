# MetaCogna RAG API Reference

Complete API documentation for the MetaCogna RAG Worker backend.

## Base URL

- **Local**: `http://localhost:8787`
- **Production**: `https://your-worker.your-subdomain.workers.dev`

## Authentication

All authenticated endpoints require either:
- **Session Cookie**: `pratejra_session` (7-day expiry, HttpOnly)
- **Bearer Token**: `Authorization: Bearer <token>` (admin-only endpoints)

### Session Cookie Format
```
pratejra_session=<session-token>; Path=/; HttpOnly; Max-Age=604800; Secure
```

### Bearer Token Format (Admin Only)
```
Authorization: Bearer base64(userId:passwordHash)
```

---

## Endpoints

### Authentication

#### POST /api/auth/login

User login with SHA-256 hashed credentials.

**Request**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "hashedPassword"  // SHA-256 hash of password
}
```

**Response (Success)**
```http
HTTP/1.1 200 OK
Set-Cookie: pratejra_session=<token>; Path=/; HttpOnly; Max-Age=604800
Content-Type: application/json

{
  "success": true,
  "user": {
    "id": "user-uuid",
    "username": "testuser",
    "email": "test@example.com",
    "name": "Test User",
    "isAdmin": false,
    "goals": "Learn RAG systems",
    "lastLogin": 1704067200000,
    "preferences": {}
  },
  "token": "session-token"
}
```

**Response (Error)**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "success": false,
  "error": "Invalid credentials"
}
```

**Notes**:
- Password must be SHA-256 hashed: `SHA256(username + password)`
- Session cookie expires after 7 days
- Sets `lastLogin` timestamp in database

---

#### POST /api/signup

**Admin-only** endpoint to create new users.

**Request**
```http
POST /api/signup
Authorization: Bearer base64(adminUserId:adminPasswordHash)
Content-Type: multipart/form-data

name=Alice Johnson
email=alice@example.com
password=SecurePass123!
goals=Build RAG system for research papers. Learn vector databases.
files[]=<file1.md>
files[]=<file2.pdf>
```

**FormData Fields**:
- `name` (required): Full name of new user
- `email` (required): Email address (must be unique)
- `password` (required): Plain text password (will be hashed)
- `goals` (required): User goals for personalization
- `files[]` (optional): Initial documents to upload (.md, .pdf, .txt)

**Response (Success)**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "userId": "user-20250101-uuid",
  "goalsSummary": "Build RAG system, learn vector databases",
  "filesUploaded": 2,
  "files": [
    {
      "id": "doc-uuid-1",
      "filename": "file1.md",
      "r2Key": "users/user-20250101-uuid/documents/doc-uuid-1-file1.md",
      "uploadedAt": 1704067200000
    },
    {
      "id": "doc-uuid-2",
      "filename": "file2.pdf",
      "r2Key": "users/user-20250101-uuid/documents/doc-uuid-2-file2.pdf",
      "uploadedAt": 1704067200000
    }
  ]
}
```

**Response (Error - Unauthorized)**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "success": false,
  "error": "Unauthorized: Admin access required"
}
```

**Response (Error - Validation)**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": "Missing required field: email"
}
```

**Notes**:
- Only admin users can call this endpoint
- Admin token validated via `Authorization` header
- User ID generated as UUID v4
- Password hashed with SHA-256 before storing
- Goals summarized using Workers AI (@cf/meta/llama-3-8b-instruct)
- Files uploaded to R2: `users/{userId}/documents/{docId}-{filename}`
- Document metadata created in D1 database

**Goal Summarization**:
- Max 200 characters
- Powered by Workers AI
- Prompt: "Summarize user goals concisely (max 200 chars)..."

**R2 Key Structure**:
```
users/{userId}/documents/{documentId}-{filename}
```

Example:
```
users/user-20250101-abc123/documents/doc-xyz789-research-paper.pdf
```

---

### Documents

#### POST /api/ingest

Upload documents for indexing (stores content in R2, metadata in D1).

**Request**
```http
POST /api/ingest
Cookie: pratejra_session=<token>
Content-Type: multipart/form-data

userId=user-uuid
file=<document.pdf>
```

**FormData Fields**:
- `userId` (required): User ID (from session)
- `file` (required): Document file (.md, .pdf, .txt)
- `metadata` (optional): JSON string with custom metadata

**Response (Success)**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "documentId": "doc-uuid",
  "r2Key": "users/user-uuid/documents/doc-uuid-document.pdf",
  "chunks": 28,
  "graphNodes": 12,
  "status": "indexed"
}
```

**Response (Error)**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": "Missing userId parameter"
}
```

**Notes**:
- Full content stored in R2
- First 500 chars stored in D1 for preview
- Generates 768-dim embeddings (Vectorize)
- Extracts graph nodes and relationships
- Returns chunk count and graph node count

**Pipeline Stages**:
1. **Chunking (0-29%)**: Text splitting into semantic chunks
2. **Embedding (30-59%)**: Vector embedding generation
3. **Graph Extraction (60-89%)**: Entity and relationship extraction
4. **Finalizing (90-100%)**: Final indexing and metadata updates

---

#### GET /api/documents

Get all documents for authenticated user.

**Request**
```http
GET /api/documents
Cookie: pratejra_session=<token>
```

**Response (Success)**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "documents": [
    {
      "id": "doc-001",
      "userId": "user-uuid",
      "title": "RAG System Overview",
      "r2Key": "users/user-uuid/documents/doc-001-overview.md",
      "uploadedAt": 1704067200000,
      "status": "indexed",
      "progress": 100,
      "chunkCount": 42,
      "metadata": {
        "author": "Alice Chen",
        "category": "Research",
        "tags": "RAG, Embeddings"
      }
    }
  ]
}
```

**Status Values**:
- `processing`: Ingestion in progress
- `indexed`: Successfully indexed
- `error`: Ingestion failed

---

#### POST /api/documents/reindex

Reindex all documents (maintenance operation).

**Request**
```http
POST /api/documents/reindex
Cookie: pratejra_session=<token>
```

**Response (Success)**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "reindexed": 15
}
```

**Notes**:
- Resets all documents to `processing` status
- Triggers re-embedding and re-graph extraction
- Use when vector index or graph needs refresh

---

#### DELETE /api/documents/purge-errors

Remove all documents with `error` status.

**Request**
```http
DELETE /api/documents/purge-errors
Cookie: pratejra_session=<token>
```

**Response (Success)**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "deleted": 3
}
```

**Notes**:
- Deletes error documents from D1
- Also removes associated R2 objects
- Cannot be undone

---

### Search

#### GET /api/search

Semantic search using vector embeddings.

**Request**
```http
GET /api/search?query=What%20is%20RAG%3F&limit=10
Cookie: pratejra_session=<token>
```

**Query Parameters**:
- `query` (required): Search query string
- `limit` (optional, default: 10): Max results to return
- `threshold` (optional, default: 0.7): Similarity threshold (0.0-1.0)

**Response (Success)**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "results": [
    {
      "id": "chunk-uuid",
      "documentId": "doc-uuid",
      "score": 0.92,
      "content": "RAG (Retrieval-Augmented Generation) combines...",
      "metadata": {
        "title": "RAG System Overview",
        "author": "Alice Chen",
        "page": 3
      }
    }
  ]
}
```

**Notes**:
- Uses Vectorize (cosine similarity)
- Query embedded with same model as documents
- Returns chunks sorted by similarity score (descending)

---

### Knowledge Graph

#### GET /api/graph

Get knowledge graph nodes and edges.

**Request**
```http
GET /api/graph?userId=user-uuid
Cookie: pratejra_session=<token>
```

**Query Parameters**:
- `userId` (required): User ID to filter graph

**Response (Success)**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "nodes": [
    {
      "id": "node-001",
      "label": "RAG",
      "type": "Concept",
      "properties": {
        "description": "Retrieval-Augmented Generation",
        "documentId": "doc-uuid"
      }
    }
  ],
  "edges": [
    {
      "source": "node-001",
      "target": "node-002",
      "relation": "uses",
      "properties": {
        "strength": 0.85
      }
    }
  ]
}
```

**Node Types**:
- `Concept`: Abstract ideas or techniques
- `Technology`: Tools, frameworks, libraries
- `Person`: Authors, researchers, organizations
- `Document`: Source documents

**Relation Types**:
- `uses`: Technology usage
- `relates`: Conceptual relationship
- `authored_by`: Authorship
- `mentions`: Reference or mention

---

## Data Models

### User
```typescript
{
  id: string;              // UUID v4
  username: string;        // Unique username
  email: string;           // Unique email
  name: string;            // Full name
  passwordHash: string;    // SHA-256(username + password)
  isAdmin: boolean;        // Admin flag
  goals: string;           // User goals (raw)
  goalsSummary: string;    // Summarized goals (200 chars)
  lastLogin: number;       // Timestamp (ms)
  preferences: object;     // JSON preferences
  createdAt: number;       // Timestamp (ms)
}
```

### Document
```typescript
{
  id: string;              // UUID v4
  userId: string;          // Owner user ID
  title: string;           // Document title
  content: string;         // First 500 chars (preview)
  r2Key: string;           // R2 object key (full content)
  uploadedAt: number;      // Timestamp (ms)
  status: 'processing' | 'indexed' | 'error';
  progress: number;        // 0-100%
  chunkCount: number;      // Semantic chunk count
  metadata: object;        // Custom metadata
}
```

### GraphNode
```typescript
{
  id: string;              // UUID v4
  userId: string;          // Owner user ID
  label: string;           // Node label
  type: string;            // Node type (Concept, Technology, etc.)
  properties: object;      // Node properties
  documentId: string;      // Source document ID
}
```

### GraphEdge
```typescript
{
  id: string;              // UUID v4
  userId: string;          // Owner user ID
  source: string;          // Source node ID
  target: string;          // Target node ID
  relation: string;        // Edge type
  properties: object;      // Edge properties
}
```

---

## Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Missing or invalid parameters |
| 401 | Unauthorized | Invalid credentials or missing auth |
| 403 | Forbidden | Insufficient permissions (non-admin) |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |

## Rate Limits

- **Free Tier**: 100 requests/minute
- **Paid Tier**: 1000 requests/minute

## Webhooks

Not yet implemented. Future feature for document processing notifications.

---

## Examples

### Full Signup Flow (Admin)

```bash
# 1. Admin logs in
curl -X POST https://api.metacogna.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "<hashed-password>"}'

# Response includes admin session cookie

# 2. Admin creates new user with files
curl -X POST https://api.metacogna.ai/api/signup \
  -H "Authorization: Bearer <admin-token>" \
  -F "name=Alice Johnson" \
  -F "email=alice@example.com" \
  -F "password=SecurePass123!" \
  -F "goals=Build RAG system for research papers" \
  -F "files[]=@research-paper.pdf" \
  -F "files[]=@notes.md"

# Response: userId, goalsSummary, filesUploaded
```

### Document Upload & Search

```bash
# 1. User logs in
curl -X POST https://api.metacogna.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "<hashed-password>"}'

# 2. Upload document
curl -X POST https://api.metacogna.ai/api/ingest \
  -H "Cookie: pratejra_session=<token>" \
  -F "userId=user-uuid" \
  -F "file=@document.pdf"

# 3. Search documents
curl "https://api.metacogna.ai/api/search?query=RAG&limit=5" \
  -H "Cookie: pratejra_session=<token>"
```

---

**Last Updated**: 2025-12-31
**API Version**: 2.0.0
