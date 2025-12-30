# Quick Start Guide

Get Metacogna up and running in minutes.

## Prerequisites

- **Node.js** 18+ or **Bun** 1.3+
- **Cloudflare Account** (free tier works)
- **API Keys** (optional, for external LLM providers):
  - OpenAI API key (optional)
  - Google Gemini API key (optional)

## Step 1: Clone and Install

```bash
git clone <repository-url>
cd metacogna-rag
bun install
```

## Step 2: Cloudflare Setup

### Create D1 Database

```bash
bun wrangler d1 create metacogna-db
```

Save the `database_id` from the output.

### Create Vectorize Index

```bash
bun wrangler vectorize create metacogna-index \
  --dimensions=768 \
  --metric=cosine
```

### Create R2 Bucket

```bash
bun wrangler r2 bucket create metacogna-vault
```

## Step 3: Configure Worker

Edit `worker/src/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "metacogna-db"
database_id = "YOUR_DATABASE_ID"

[[vectorize]]
binding = "VECTOR_INDEX"
index_name = "metacogna-index"

[[r2_buckets]]
binding = "metacogna_vault"
bucket_name = "metacogna-vault"
```

## Step 4: Initialize Database

```bash
bun wrangler d1 execute metacogna-db --file=db/schema.sql
```

## Step 5: Set Environment Variables

Create `.env.local`:

```env
VITE_WORKER_API_URL=http://localhost:8787
VITE_GEMINI_API_KEY=your_google_api_key_optional
VITE_OPENAI_API_KEY=your_openai_key_optional
```

For production, set secrets in Cloudflare:

```bash
bun wrangler secret put OPENAI_API_KEY
bun wrangler secret put GEMINI_API_KEY
```

## Step 6: Run Development

### Start Worker

```bash
bun run worker:dev
```

Worker runs on `http://localhost:8787`

### Start Frontend

```bash
bun run dev
```

Frontend runs on `http://localhost:5173`

## Step 7: Access Application

1. Open `http://localhost:5173`
2. Register a new account
3. Upload a document
4. Start chatting!

## Common Issues

### Worker Not Found

- Ensure `wrangler.toml` paths are correct
- Check database and index names match

### CORS Errors

- Verify worker CORS headers
- Check `VITE_WORKER_API_URL` matches worker URL

### Database Errors

- Run schema initialization
- Check database ID in `wrangler.toml`

## Next Steps

- Read the [Overview](./01-overview.md) for concepts
- Explore [Architecture](./architecture/) for system design
- Check [Features](./features/) for detailed guides

