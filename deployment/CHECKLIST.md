# Cloudflare Workers Deployment Checklist

Quick reference checklist for deploying Pratejra RAG to Cloudflare Workers.

## Pre-Deployment Checklist

- [ ] Cloudflare account created
- [ ] Workers plan activated (Free or Paid)
- [ ] Wrangler installed: `bun install`
- [ ] Authenticated: `bun wrangler login`
- [ ] Verified auth: `bun wrangler whoami`

## Deployment Steps

### 1. Database Setup
```bash
# Create D1 database
bun run db:create
```
- [ ] Command executed successfully
- [ ] `database_id` copied from output
- [ ] `database_id` pasted into `wrangler.toml` line 21

### 2. Vector Index Setup
```bash
# Create Vectorize index
bun run vector:create
```
- [ ] Index created successfully
- [ ] Verified with: `bun run vector:info`

### 3. Initialize Database Schema
```bash
# Run schema migration
bun run db:init
```
- [ ] Schema executed successfully
- [ ] Tables created: users, documents, graph_nodes, graph_edges
- [ ] Verified with: `bun wrangler d1 execute pratejra-db --command "SELECT name FROM sqlite_master WHERE type='table'"`

### 4. Configure Secrets (Optional)
```bash
# Set Langfuse keys (if using observability)
bun wrangler secret put LANGFUSE_PUBLIC_KEY
bun wrangler secret put LANGFUSE_SECRET_KEY
```
- [ ] LANGFUSE_PUBLIC_KEY set (or skipped)
- [ ] LANGFUSE_SECRET_KEY set (or skipped)

### 5. Test Locally (Optional but Recommended)
```bash
# Start local dev server
bun run worker:dev
```
- [ ] Worker starts without errors
- [ ] Test endpoint: `curl http://localhost:8787/`
- [ ] No console errors

### 6. Deploy to Production
```bash
# Build and deploy
bun run deploy:full
```
- [ ] Build completed successfully
- [ ] Worker deployed
- [ ] Deployment URL received
- [ ] URL saved: `https://pratejra-rag-worker.YOUR-SUBDOMAIN.workers.dev`

### 7. Post-Deployment Verification
```bash
# Test production endpoint
curl https://pratejra-rag-worker.YOUR-SUBDOMAIN.workers.dev/api/graph

# Monitor logs
bun run worker:tail
```
- [ ] Production endpoint responds
- [ ] No errors in logs
- [ ] API returns expected data format

## Configuration Checklist

### wrangler.toml
- [ ] `name` set correctly
- [ ] `main` points to `worker/src/index.ts`
- [ ] `compatibility_date` is `2024-01-01` or later
- [ ] `compatibility_flags = ["nodejs_compat"]` present
- [ ] `[ai]` binding configured
- [ ] `[[vectorize]]` binding configured with correct `index_name`
- [ ] `[[d1_databases]]` binding configured with actual `database_id`
- [ ] `[vars]` contains public environment variables

### .env.local (Local Development)
- [ ] Created from `.env.example`
- [ ] `LANGFUSE_HOST` set (if using Langfuse)
- [ ] `LANGFUSE_PUBLIC_KEY` set (if using Langfuse)
- [ ] `LANGFUSE_SECRET_KEY` set (if using Langfuse)

### Frontend Configuration
- [ ] `constants.ts` updated with worker URL
- [ ] CORS settings verified in worker code
- [ ] API endpoints point to correct worker domain

## Automated Setup (Alternative)

For quick setup, run the automated script:
```bash
bun run deploy:setup
```
This runs: `db:create` → `vector:create` → `db:init`

Then manually:
1. Update `wrangler.toml` with `database_id`
2. Run `bun run deploy:full`

## Troubleshooting Quick Fixes

### Authentication Error
```bash
bun wrangler logout
bun wrangler login
bun wrangler whoami
```

### Database Already Exists
```bash
# Use existing database
bun wrangler d1 list
# Copy existing database_id to wrangler.toml

# OR delete and recreate
bun wrangler d1 delete pratejra-db
bun run db:create
```

### Vector Index Already Exists
```bash
# Use existing index
bun wrangler vectorize list

# OR delete and recreate
bun wrangler vectorize delete pratejra-index
bun run vector:create
```

### Worker Fails to Deploy
```bash
# Test locally first
bun run worker:dev

# Check for syntax errors
bun run lint

# Verify all bindings in wrangler.toml
```

## Post-Deployment Tasks

- [ ] Update frontend `CONFIG.workerUrl` with production URL
- [ ] Test all API endpoints:
  - [ ] `/api/auth/login`
  - [ ] `/api/auth/register`
  - [ ] `/api/ingest`
  - [ ] `/api/search`
  - [ ] `/api/graph`
- [ ] Monitor performance in Cloudflare dashboard
- [ ] Set up alerts for errors/downtime
- [ ] Document deployment URL for team

## Deployment Commands Reference

| Task | Command |
|------|---------|
| **Setup** | `bun run deploy:setup` |
| **Deploy** | `bun run deploy:full` |
| **Logs** | `bun run worker:tail` |
| **Local Dev** | `bun run worker:dev` |
| **DB Query** | `bun wrangler d1 execute pratejra-db --command "SQL"` |
| **Vector Info** | `bun run vector:info` |
| **Rollback** | `bun wrangler rollback` |

## Resources

- Full deployment guide: `deployment/DEPLOYMENT.md`
- Worker configuration: `deployment/wrangler.md`
- Environment variables: `.env.example`
- Worker source: `worker/src/index.ts`
- Database schema: `db/schema.sql`

## Notes

- Free tier limits: 100,000 requests/day
- D1 free tier: 5GB storage, 5M reads/day
- Vectorize free tier: 30M queried dimensions/month
- Workers AI: 10,000 neurons/day (free tier)

## Completion

Once all checkboxes are marked, your Cloudflare Workers deployment is complete!

Deployment URL: `https://pratejra-rag-worker.YOUR-SUBDOMAIN.workers.dev`

Next Steps:
1. Update frontend to use production worker URL
2. Test end-to-end user flows
3. Monitor logs and analytics
4. Set up CI/CD for automated deployments
