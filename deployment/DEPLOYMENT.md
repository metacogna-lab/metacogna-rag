# Cloudflare Workers Deployment Guide

Complete guide for deploying Pratejra RAG to Cloudflare Workers with D1 Database and Vectorize.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Step-by-Step Deployment](#step-by-step-deployment)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)
- [Post-Deployment](#post-deployment)

## Prerequisites

Before deploying, ensure you have:

1. **Cloudflare Account** with Workers enabled
   - Sign up at https://dash.cloudflare.com/sign-up
   - Workers Plan: Free tier available (100,000 requests/day)

2. **Wrangler CLI** installed (already in devDependencies)
   ```bash
   bun install  # Installs wrangler@3.114.16
   ```

3. **Cloudflare Authentication**
   ```bash
   # Login to Cloudflare
   bun wrangler login

   # Verify authentication
   bun wrangler whoami
   ```

4. **Required Cloudflare Features**
   - D1 Database (Relational storage)
   - Vectorize (Vector search)
   - Workers AI (Embeddings & LLM inference)
   - All features available on Free/Paid Workers plans

## Quick Start

For rapid deployment, use the automated setup script:

```bash
# 1. Run complete setup (creates DB, vector index, initializes schema)
bun run deploy:setup

# 2. Copy database_id from output and update wrangler.toml

# 3. Deploy worker
bun run worker:deploy
```

## Step-by-Step Deployment

### Step 1: Authenticate with Cloudflare

```bash
# Login to Cloudflare (opens browser for OAuth)
bun wrangler login

# Verify you're logged in
bun wrangler whoami
```

**Expected Output:**
```
You are logged in with an OAuth Token, associated with the email your-email@example.com
```

### Step 2: Create D1 Database

```bash
# Create the database
bun run db:create

# Alternative: Direct command
bun wrangler d1 create pratejra-db
```

**Expected Output:**
```
✅ Successfully created DB 'pratejra-db'

[[d1_databases]]
binding = "DB"
database_name = "pratejra-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**IMPORTANT:** Copy the `database_id` value!

### Step 3: Update wrangler.toml

Open `wrangler.toml` and replace the placeholder:

```toml
[[d1_databases]]
binding = "DB"
database_name = "pratejra-db"
database_id = "INSERT_YOUR_D1_ID_HERE"  # ← Replace with actual ID from Step 2
```

### Step 4: Create R2 Bucket

**R2** is Cloudflare's object storage for document content (full text, metadata, files).

```bash
# Create R2 bucket
bun wrangler r2 bucket create metacogna-vault
```

**Expected Output:**
```
✅ Successfully created bucket 'metacogna-vault'
```

**Verify creation:**
```bash
# List all R2 buckets
bun wrangler r2 bucket list
```

**Update wrangler.toml** with R2 binding:

Open `wrangler.toml` and add the R2 bucket binding:

```toml
[[r2_buckets]]
binding = "METACOGNA_VAULT"  # Must match worker/src/index.ts Env interface
bucket_name = "metacogna-vault"
```

**IMPORTANT**: The `binding` name must be `METACOGNA_VAULT` (all caps) to match the Worker code.

**R2 Usage**:
- **Document Content**: Full document text stored in R2 (not D1)
- **R2 Key Format**: `users/{userId}/documents/{documentId}-{filename}`
- **D1 Metadata**: Document preview (first 500 chars) + r2Key reference
- **Benefits**: No D1 size limits, scalable storage, lower costs

**Example R2 Key**:
```
users/user-20250101-abc123/documents/doc-xyz789-research-paper.pdf
```

### Step 5: Create Vector Index

```bash
# Create Vectorize index
bun run vector:create

# Alternative: Direct command
bun wrangler vectorize create pratejra-index --dimensions=768 --metric=cosine
```

**Expected Output:**
```
✅ Successfully created index 'pratejra-index'

Configuration:
  dimensions: 768
  metric: cosine
```

**Verify creation:**
```bash
bun run vector:info
```

### Step 6: Initialize Database Schema

```bash
# Run schema initialization
bun run db:init

# Alternative: Direct command
bun wrangler d1 execute pratejra-db --file=db/schema.sql
```

**Expected Output:**
```
🌀 Executing on pratejra-db:
🌀 To execute on your remote database, add a --remote flag to your wrangler command.

✅ Executed 4 commands in 0.123 seconds
```

**Verify schema:**
```bash
# List tables
bun wrangler d1 execute pratejra-db --command "SELECT name FROM sqlite_master WHERE type='table'"
```

**Expected tables:**
- users
- documents
- graph_nodes
- graph_edges

### Step 7: Configure Secrets (Optional)

If using Langfuse observability:

```bash
# Set Langfuse public key
bun wrangler secret put LANGFUSE_PUBLIC_KEY
# Enter: pk-lf-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Set Langfuse secret key
bun wrangler secret put LANGFUSE_SECRET_KEY
# Enter: sk-lf-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Note:** Secrets are encrypted and not visible in wrangler.toml

### Step 8: Test Worker Locally (Optional)

```bash
# Start local development server
bun run worker:dev

# Alternative with specific port
bun wrangler dev --port 8787
```

**Test endpoints:**
```bash
# Health check
curl http://localhost:8787/

# Test search (requires data)
curl -X POST http://localhost:8787/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test query", "topK": 5}'
```

### Step 9: Deploy to Production

```bash
# Build frontend and deploy worker
bun run deploy:full

# Alternative: Deploy worker only
bun run worker:deploy

# Alternative: Direct command
bun wrangler deploy
```

**Expected Output:**
```
Total Upload: xx.xx KiB / gzip: xx.xx KiB
Uploaded pratejra-rag-worker (x.xx sec)
Published pratejra-rag-worker (x.xx sec)
  https://pratejra-rag-worker.your-subdomain.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Step 10: Verify Deployment

```bash
# Tail real-time logs
bun run worker:tail

# Test production endpoint
curl https://pratejra-rag-worker.your-subdomain.workers.dev/api/graph
```

## Environment Configuration

### Local Development (.env.local)

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```bash
# Langfuse Observability (Optional)
LANGFUSE_HOST=https://cloud.langfuse.com
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Production Secrets (Cloudflare)

Set via Wrangler CLI:
```bash
bun wrangler secret put LANGFUSE_PUBLIC_KEY
bun wrangler secret put LANGFUSE_SECRET_KEY
```

### Public Variables (wrangler.toml)

Non-sensitive variables in `[vars]` section:
```toml
[vars]
LANGFUSE_HOST = "https://cloud.langfuse.com"
```

## Available NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `worker:dev` | `bun wrangler dev` | Start local worker dev server |
| `worker:deploy` | `bun wrangler deploy` | Deploy worker to production |
| `worker:tail` | `bun wrangler tail` | Stream real-time logs |
| `db:create` | `bun wrangler d1 create pratejra-db` | Create D1 database |
| `db:init` | `bun wrangler d1 execute pratejra-db --file=db/schema.sql` | Initialize schema |
| `db:query` | `bun wrangler d1 execute pratejra-db --command` | Run SQL query |
| `vector:create` | `bun wrangler vectorize create pratejra-index` | Create vector index |
| `vector:info` | `bun wrangler vectorize get pratejra-index` | Get index info |
| `deploy:setup` | Combined | Run all setup steps |
| `deploy:full` | Combined | Build + Deploy |

## Troubleshooting

### Authentication Errors

**Error:** `Authentication error [code: 10000]`

**Solution:**
```bash
# Re-authenticate
bun wrangler logout
bun wrangler login

# Verify permissions
bun wrangler whoami
```

Required permissions:
- `d1 (write)`
- `ai (write)`
- `workers_scripts (write)`

### Database Already Exists

**Error:** `Database 'pratejra-db' already exists`

**Solution:**
```bash
# List existing databases
bun wrangler d1 list

# Use existing database ID in wrangler.toml
# Or delete and recreate:
bun wrangler d1 delete pratejra-db
bun run db:create
```

### Vector Index Already Exists

**Error:** `Index 'pratejra-index' already exists`

**Solution:**
```bash
# List existing indexes
bun wrangler vectorize list

# Use existing index
# Or delete and recreate:
bun wrangler vectorize delete pratejra-index
bun run vector:create
```

### Schema Migration Errors

**Error:** `table already exists`

**Solution:**
```bash
# Schema uses IF NOT EXISTS, safe to re-run
bun run db:init

# Or drop all tables first (CAUTION: deletes data)
bun wrangler d1 execute pratejra-db --command "DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS documents; DROP TABLE IF EXISTS graph_nodes; DROP TABLE IF EXISTS graph_edges;"
bun run db:init
```

### Worker Deployment Fails

**Error:** `Uncaught TypeError: Cannot read property 'X' of undefined`

**Solution:**
1. Verify all bindings in wrangler.toml
2. Check worker/src/index.ts for syntax errors
3. Test locally first:
   ```bash
   bun run worker:dev
   ```
4. Check compatibility flags:
   ```toml
   compatibility_flags = ["nodejs_compat"]
   ```

### CORS Errors in Browser

**Issue:** Frontend can't reach worker API

**Solution:**
1. Worker already includes CORS headers (see worker/src/index.ts:22-25)
2. Update frontend API URL in constants.ts:
   ```typescript
   CONFIG.workerUrl = 'https://pratejra-rag-worker.your-subdomain.workers.dev'
   ```

## Post-Deployment

### Monitor Worker Performance

```bash
# Real-time logs
bun run worker:tail

# View analytics in dashboard
# https://dash.cloudflare.com -> Workers & Pages -> pratejra-rag-worker
```

### Database Management

```bash
# Query users
bun wrangler d1 execute pratejra-db --command "SELECT * FROM users LIMIT 10"

# Query documents
bun wrangler d1 execute pratejra-db --command "SELECT id, title FROM documents LIMIT 10"

# Query knowledge graph
bun wrangler d1 execute pratejra-db --command "SELECT * FROM graph_nodes LIMIT 10"

# Count records
bun wrangler d1 execute pratejra-db --command "SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM documents) as documents,
  (SELECT COUNT(*) FROM graph_nodes) as graph_nodes,
  (SELECT COUNT(*) FROM graph_edges) as graph_edges"
```

### Vector Index Management

```bash
# Get index statistics
bun run vector:info

# Query vectors (via worker API)
curl -X POST https://pratejra-rag-worker.your-subdomain.workers.dev/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "machine learning", "topK": 5}'
```

### Update Worker

```bash
# After code changes
bun run deploy:full

# Or just deploy worker
bun run worker:deploy
```

### Rollback Deployment

```bash
# List deployments
bun wrangler deployments list

# Rollback to previous version
bun wrangler rollback --message "Reverting to previous version"
```

## Architecture Overview

```
┌─────────────────────┐
│   React Frontend    │
│   (Vite + Bun)      │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│ Cloudflare Worker   │
│ (worker/src/index.ts)│
└──────────┬──────────┘
           │
    ┌──────┼──────┬──────────┐
    │      │      │          │
    ▼      ▼      ▼          ▼
┌──────┐┌────┐┌────────┐┌─────────┐
│  AI  ││ D1 ││Vectorize││Langfuse │
│Binding││ DB ││ Index  ││(Optional)│
└──────┘└────┘└────────┘└─────────┘
```

## Resources

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **D1 Database Docs**: https://developers.cloudflare.com/d1/
- **Vectorize Docs**: https://developers.cloudflare.com/vectorize/
- **Workers AI Docs**: https://developers.cloudflare.com/workers-ai/
- **Wrangler CLI Docs**: https://developers.cloudflare.com/workers/wrangler/
- **Langfuse Docs**: https://langfuse.com/docs

## Support

For issues specific to this project:
- Check `deployment/wrangler.md` for configuration details
- Review `worker/src/index.ts` for worker implementation
- See `.env.example` for required environment variables

For Cloudflare-specific issues:
- Cloudflare Community: https://community.cloudflare.com/
- Cloudflare Discord: https://discord.gg/cloudflaredev
