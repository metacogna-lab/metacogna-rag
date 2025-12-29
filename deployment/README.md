# Deployment Resources

This directory contains all resources needed to deploy Pratejra RAG to Cloudflare Workers.

## Quick Start

Choose your deployment method:

### Method 1: Automated Script (Recommended)
```bash
# Authenticate first
bun wrangler login

# Full deployment (setup + deploy)
./deployment/deploy.sh --full

# Or step by step
./deployment/deploy.sh --setup        # Setup resources
./deployment/deploy.sh --worker-only  # Deploy worker
```

### Method 2: NPM Scripts
```bash
# Authenticate first
bun wrangler login

# Setup resources
bun run deploy:setup

# Update wrangler.toml with database_id (output from previous command)

# Deploy
bun run deploy:full
```

### Method 3: Manual Commands
```bash
# See DEPLOYMENT.md for step-by-step manual instructions
```

## Files in This Directory

### Documentation
- **DEPLOYMENT.md** - Complete deployment guide with troubleshooting
- **CHECKLIST.md** - Quick reference checklist for deployment
- **wrangler.md** - Original configuration documentation
- **README.md** - This file

### Scripts
- **deploy.sh** - Automated deployment script
  - `--full` - Complete setup and deployment
  - `--setup` - Resource setup only
  - `--worker-only` - Deploy worker only
  - `--verify` - Verify database setup
  - `--test` - Test deployed worker

## Prerequisites

Before deployment, ensure you have:

1. **Cloudflare account** with Workers enabled
2. **Bun installed** (already configured in project)
3. **Wrangler authenticated**: `bun wrangler login`
4. **Cloudflare features available**:
   - D1 Database
   - Vectorize
   - Workers AI

## Deployment Steps Overview

1. **Authenticate**
   ```bash
   bun wrangler login
   ```

2. **Run Setup**
   ```bash
   ./deployment/deploy.sh --setup
   ```
   This creates:
   - D1 database (`pratejra-db`)
   - Vectorize index (`pratejra-index`)
   - Database schema (tables: users, documents, graph_nodes, graph_edges)

3. **Update Configuration**
   - `wrangler.toml` is automatically updated with database_id
   - Verify the update or manually edit if needed

4. **Deploy Worker**
   ```bash
   ./deployment/deploy.sh --worker-only
   ```

5. **Verify Deployment**
   ```bash
   ./deployment/deploy.sh --test
   ```

## Configuration Files

### wrangler.toml
Located in project root. Contains:
- Worker name and entry point
- D1 database binding
- Vectorize index binding
- Workers AI binding
- Environment variables

### .env.example
Located in project root. Template for:
- Langfuse observability keys (optional)
- Local development environment variables

### db/schema.sql
Located in `db/` directory. Defines database schema:
- `users` - Authentication
- `documents` - Document metadata
- `graph_nodes` - Knowledge graph nodes
- `graph_edges` - Knowledge graph relationships

## Available NPM Scripts

All deployment-related scripts added to package.json:

```json
{
  "worker:dev": "Local worker development server",
  "worker:deploy": "Deploy worker to production",
  "worker:tail": "Stream real-time logs",
  "db:create": "Create D1 database",
  "db:init": "Initialize database schema",
  "db:query": "Run SQL query on database",
  "vector:create": "Create Vectorize index",
  "vector:info": "Get vector index info",
  "deploy:setup": "Automated setup (db + vector + schema)",
  "deploy:full": "Build and deploy (build + deploy worker)"
}
```

## Deployment Modes

### Local Development
```bash
# Start local worker
bun run worker:dev

# Access at http://localhost:8787
```

### Production Deployment
```bash
# Deploy to Cloudflare
bun run worker:deploy

# Access at https://pratejra-rag-worker.YOUR-SUBDOMAIN.workers.dev
```

## Post-Deployment

After successful deployment:

1. **Get Worker URL**
   - Displayed in deployment output
   - Saved to `.worker_url` (if using deploy.sh)

2. **Update Frontend**
   - Update `constants.ts` with worker URL
   - Set `CONFIG.workerUrl` to production URL

3. **Test Endpoints**
   ```bash
   # Health check
   curl https://YOUR-WORKER-URL.workers.dev/

   # Graph endpoint
   curl https://YOUR-WORKER-URL.workers.dev/api/graph

   # Search (requires data)
   curl -X POST https://YOUR-WORKER-URL.workers.dev/api/search \
     -H "Content-Type: application/json" \
     -d '{"query": "test", "topK": 5}'
   ```

4. **Monitor Logs**
   ```bash
   bun run worker:tail
   ```

## Troubleshooting

### Common Issues

1. **Authentication Error**
   ```bash
   bun wrangler logout
   bun wrangler login
   ```

2. **Database Already Exists**
   ```bash
   bun wrangler d1 list
   # Use existing database_id in wrangler.toml
   ```

3. **Vector Index Already Exists**
   ```bash
   bun wrangler vectorize list
   # Index is reusable, no action needed
   ```

4. **Worker Deployment Fails**
   - Test locally first: `bun run worker:dev`
   - Check syntax: `bun run lint`
   - Verify bindings in `wrangler.toml`

See **DEPLOYMENT.md** for detailed troubleshooting.

## Resources

### Internal Documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [CHECKLIST.md](./CHECKLIST.md) - Deployment checklist
- [wrangler.md](./wrangler.md) - Configuration reference

### Worker Code
- `worker/src/index.ts` - Worker implementation
- `db/schema.sql` - Database schema
- `wrangler.toml` - Worker configuration

### Cloudflare Documentation
- [Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [Vectorize](https://developers.cloudflare.com/vectorize/)
- [Workers AI](https://developers.cloudflare.com/workers-ai/)

## Support

For deployment issues:
1. Check `DEPLOYMENT.md` troubleshooting section
2. Verify authentication: `bun wrangler whoami`
3. Check Cloudflare dashboard for resource status
4. Review worker logs: `bun run worker:tail`

## Notes

- Free tier limits apply (see DEPLOYMENT.md)
- Database ID is automatically saved to `.database_id`
- Worker URL is saved to `.worker_url` (when using deploy.sh)
- Secrets must be set separately: `bun wrangler secret put KEY_NAME`

## Quick Command Reference

```bash
# Authentication
bun wrangler login
bun wrangler whoami

# Setup (choose one)
./deployment/deploy.sh --setup      # Automated
bun run deploy:setup                # NPM script

# Deploy (choose one)
./deployment/deploy.sh --worker-only # Automated
bun run worker:deploy                # NPM script

# Full deployment (choose one)
./deployment/deploy.sh --full        # Automated
bun run deploy:full                  # NPM script

# Monitoring
bun run worker:tail                  # Stream logs
bun wrangler deployments list        # List deployments

# Database management
bun run db:query "SELECT * FROM users LIMIT 10"
bun wrangler d1 execute pratejra-db --command "SQL"

# Vector index
bun run vector:info
bun wrangler vectorize get pratejra-index
```

## Deployment Checklist

For a printable checklist, see [CHECKLIST.md](./CHECKLIST.md)

- [ ] Authenticated with Cloudflare
- [ ] D1 database created
- [ ] Vector index created
- [ ] Database schema initialized
- [ ] wrangler.toml updated with database_id
- [ ] Worker deployed
- [ ] Endpoints tested
- [ ] Frontend updated with worker URL
