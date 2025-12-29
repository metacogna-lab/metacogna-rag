
# Cloudflare Worker Configuration

When deploying to Cloudflare, copy the following configuration into your `wrangler.toml`. This configuration enables D1 for relational storage, Vectorize for embeddings, and Workers AI for inference.

```toml
name = "pratejra-rag-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# --- AI BINDING ---
[ai]
binding = "AI"

# --- VECTOR DATABASE ---
[[vectorize]]
binding = "VECTOR_INDEX"
index_name = "pratejra-index"

# --- D1 DATABASE ---
[[d1_databases]]
binding = "DB"
database_name = "pratejra-db"
database_id = "INSERT_YOUR_D1_ID_HERE"

# --- ENVIRONMENT VARIABLES ---
[vars]
LANGFUSE_HOST = "https://cloud.langfuse.com" 

# [observability]
# enabled = true
```

## Setup Commands

Run these commands to initialize your Cloudflare resources:

1. **Create Database**:
   ```bash
   npx wrangler d1 create pratejra-db
   ```
   *Copy the `database_id` from the output into `wrangler.toml`.*

2. **Create Vector Index**:
   ```bash
   npx wrangler vectorize create pratejra-index --dimensions=768 --metric=cosine
   ```

3. **Initialize Schema (D1)**:
   Create a file `schema.sql` with the content below, then run:
   ```bash
   npx wrangler d1 execute pratejra-db --file=schema.sql
   ```

### Schema SQL (`schema.sql`)

```sql
-- Users for Auth
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, 
    username TEXT, 
    passwordHash TEXT, 
    createdAt INTEGER
);

-- Documents Metadata
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY, 
    title TEXT, 
    content TEXT, 
    metadata TEXT, 
    createdAt INTEGER
);

-- Knowledge Graph Nodes
CREATE TABLE IF NOT EXISTS graph_nodes (
    id TEXT PRIMARY KEY, 
    label TEXT, 
    type TEXT, 
    summary TEXT
);

-- Knowledge Graph Edges
CREATE TABLE IF NOT EXISTS graph_edges (
    id TEXT PRIMARY KEY, 
    source TEXT, 
    target TEXT, 
    relation TEXT
);
```
