# MetaCogna RAG

**Retrieval-Augmented Generation (RAG) System** with Worker-based authentication, R2 document storage, and knowledge graph extraction.

## Overview

MetaCogna RAG is a production-ready RAG system built on Cloudflare Workers with:

- **Admin-Only User Management**: Controlled user creation with goal-driven personalization
- **Worker Authentication**: SHA-256 hashed credentials, cookie-based sessions (7-day expiry)
- **R2 Document Storage**: Scalable object storage for document content
- **D1 Database**: Metadata, graph nodes, and user data
- **Vectorize**: Semantic search with 768-dimensional embeddings
- **Knowledge Graph**: Entity and relationship extraction
- **Prompt Engineering Lab**: Template library with variable interpolation
- **Frontend Enhancements**: Metadata tooltips, pipeline stages, maintenance UI

## Architecture

### Backend (Cloudflare Workers)
- **Runtime**: Cloudflare Workers (Edge compute)
- **Database**: D1 (SQLite at edge)
- **Storage**: R2 (Object storage)
- **Vector Search**: Vectorize (cosine similarity, 768 dimensions)
- **AI Models**: Workers AI (@cf/meta/llama-3-8b-instruct)

### Frontend (React + TypeScript)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS (Paper UI theme)
- **Icons**: Lucide React
- **Build**: Vite (HMR, fast builds)

### Testing
- **E2E**: Playwright (29 tests across signup, auth, upload flows)
- **Unit**: Bun test (worker tests)
- **Coverage**: 100% for new backend functions

## Features

### 🔐 Authentication & User Management
- **Admin-Only Signup**: Only administrators can create new users
- **Worker-Based Auth**: No localStorage for credentials (Worker validates)
- **SHA-256 Hashing**: Secure password hashing (username + password)
- **Cookie Sessions**: 7-day expiry, HttpOnly, secure
- **Guest Login**: Login-only interface (no signup button for non-admin)
- **Access Control**: Admin-only UI gates for sensitive operations

### 📄 Document Management
- **Multi-File Upload**: Upload .md, .pdf, .txt files
- **R2 Storage**: Full content stored in R2, metadata in D1
- **Metadata Tooltips**: Hover to see full metadata (author, category, tags)
- **Status Tracking**: processing, indexed, error badges
- **Chunk Count**: Display semantic chunks per document
- **Maintenance UI**: Reindex All, Purge Errors operations

### 🔄 Ingestion Pipeline
- **4-Stage Visualization**: Color-coded progress (Chunking, Embedding, Graph, Finalizing)
- **Animated Progress**: Diagonal stripe animation during processing
- **Percentage Display**: Real-time progress tracking (0-100%)
- **Pipeline Stages**:
  - **Chunking (0-29%)**: Blue - Document text splitting
  - **Embedding (30-59%)**: Purple - Vector embedding generation
  - **Graph Extraction (60-89%)**: Indigo - Knowledge graph extraction
  - **Finalizing (90-100%)**: Emerald - Final indexing

### 🧪 Prompt Engineering Lab
- **Template Library**: 3 production-ready templates
  - **RAG Query**: Optimized for retrieval-augmented generation
  - **Code Review**: Comprehensive code analysis
  - **Goal Analysis**: Strategic goal breakdown
- **Variable Interpolation**: Insert {{context}}, {{query}}, {{code}}, {{focus}}, {{goal}} placeholders
- **Cursor-Aware Insertion**: Variables inserted at cursor position
- **Template Selector**: 3-column grid UI with icons and descriptions

### ⚙️ Settings & Configuration
- **Model Selection**: OpenAI, Anthropic, Google, Ollama, Workers AI
- **Latest Models**: GPT-4o, Claude 3.5 Sonnet, Gemini 2.0 Flash, Llama 3.1
- **API Key Management**: Secure localStorage with submit buttons
- **Temperature Control**: Adjustable generation creativity (0.0-1.0)

## Quick Start

### Prerequisites
- **Bun** (recommended) or Node.js 18+
- **Cloudflare Account** (for Workers deployment)
- **Wrangler CLI** (installed via bun)

### Local Development

1. **Clone Repository**
```bash
git clone <repository-url>
cd metacogna-rag
```

2. **Install Dependencies**
```bash
bun install
```

3. **Set Environment Variables**
```bash
cp .env.example .env.local
# Add your API keys:
# - VITE_GEMINI_API_KEY (required for Prompt Lab)
# - Other API keys as needed
```

4. **Run Development Server**
```bash
bun run dev
```

Application runs at: `http://localhost:3000`

### Testing

**E2E Tests (Playwright)**
```bash
bun run test:e2e          # Headless mode
bun run test:e2e:ui       # Playwright UI
bun run test:e2e:headed   # Browser visible
bun run test:e2e:debug    # Debugger
bun run test:e2e:report   # Show HTML report
```

**Worker Tests (Bun)**
```bash
bun run test:worker
```

### Deployment

See [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md) for comprehensive deployment guide.

**Quick Deploy**
```bash
# 1. Set up infrastructure
bun run deploy:setup

# 2. Deploy Worker + Frontend
bun run deploy:full
```

## Project Structure

```
metacogna-rag/
├── components/          # React components (PaperComponents, etc.)
├── views/              # Main views (Upload, Chat, Graph, Prompt Lab, Settings)
├── services/           # Frontend services (AuthService, API client)
├── worker/             # Cloudflare Worker backend
│   ├── src/
│   │   ├── index.ts           # Main Worker entry
│   │   ├── services/          # R2, summarization services
│   │   ├── handlers/          # Upload, auth handlers
│   │   └── utils/             # UUID, R2 keys utilities
│   └── __tests__/      # Worker tests
├── db/                 # Database schema (schema.sql)
├── e2e/                # Playwright E2E tests
│   ├── signup-flow.spec.ts    # Admin signup workflow
│   ├── auth-flow.spec.ts      # Authentication tests
│   └── upload-flow.spec.ts    # Document upload tests
├── deployment/         # Deployment docs and scripts
├── tasks/              # Project tracking (bridge.md)
└── docs/               # Additional documentation
```

## User Workflows

### Admin: Create New User

1. **Login as Admin** (username + password)
2. **Click "Create User"** (admin-only button)
3. **Fill Signup Form**:
   - Full Name
   - Email
   - Password
   - User Goals (monitored by MetaCogna agent for personalization)
   - Initial Files (optional, .md/.pdf/.txt)
4. **Submit** → User created with UUID, goals summarized, files uploaded to R2
5. **Success Message** shows user email and goal summary

### User: Login & Upload Documents

1. **Login** (username + password)
2. **Navigate to Documents**
3. **Upload Files** (drag-drop or browse)
4. **Monitor Progress** (4-stage pipeline visualization)
5. **View Metadata** (hover over metadata badges for full details)
6. **Perform Maintenance** (Reindex All or Purge Errors if needed)

### User: Prompt Engineering

1. **Navigate to Prompt Lab**
2. **Select Template** (RAG Query, Code Review, Goal Analysis)
3. **Insert Variables** ({{context}}, {{query}}, etc.)
4. **Edit Prompt** as needed
5. **Generate Optimized Prompt** (Gemini AI optimization)
6. **Save to Library** for reuse

## Admin-Only Features

| Feature | Admin Only | Non-Admin Access |
|---------|------------|------------------|
| Create User (Signup) | ✅ Yes | ❌ No |
| Upload Documents | ✅ Yes | ✅ Yes |
| View Knowledge Graph | ✅ Yes | ✅ Yes |
| Prompt Engineering Lab | ✅ Yes | ✅ Yes |
| Settings (API Keys, Models) | ✅ Yes | ✅ Yes |
| Document Maintenance (Reindex, Purge) | ✅ Yes | ✅ Yes |

**Key Restriction**: Only admin users can create new accounts. Non-admin users see "No account? Contact administrator" message.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login (returns session cookie)
- `POST /api/signup` - Admin-only user creation (requires Bearer token)

### Documents
- `POST /api/ingest` - Upload documents (stores in R2, creates D1 metadata)
- `GET /api/search` - Semantic search with vector embeddings
- `GET /api/graph` - Knowledge graph nodes and relationships
- `POST /api/documents/reindex` - Reindex all documents
- `DELETE /api/documents/purge-errors` - Remove failed documents

See [deployment/API_REFERENCE.md](deployment/API_REFERENCE.md) for detailed API documentation.

## Configuration

### LLM Providers

| Provider | Models | API Key Required |
|----------|--------|------------------|
| OpenAI | gpt-4o, gpt-4o-mini, o1-preview, o1-mini | Yes |
| Anthropic | Claude 3.5 Sonnet, Claude 3.5 Haiku | Yes |
| Google | Gemini 2.0 Flash, Gemini 1.5 Pro/Flash | Yes |
| Ollama | Llama 3.2, Mistral Nemo (local) | No (local) |
| Workers AI | Llama 3/3.1, Mistral, Qwen, DeepSeek | No (Cloudflare) |

### Default Settings
- **Default Model**: GPT-4o Mini (OpenAI)
- **Default Temperature**: 0.7
- **Session Expiry**: 7 days
- **Vector Dimensions**: 768 (Vectorize)
- **Chunk Size**: 500 characters (D1 preview), full in R2

## Development Scripts

```bash
# Frontend
bun run dev              # Start Vite dev server
bun run build            # Build for production
bun run preview          # Preview production build
bun run lint             # ESLint check

# Worker
bun run worker:dev       # Run Worker locally
bun run worker:deploy    # Deploy Worker to Cloudflare
bun run worker:tail      # Stream Worker logs

# Database
bun run db:create        # Create D1 database
bun run db:init          # Initialize schema (schema.sql)
bun run db:query         # Execute SQL query

# Vectorize
bun run vector:create    # Create Vectorize index
bun run vector:info      # Get index info

# Testing
bun run test:e2e         # Run E2E tests
bun run test:worker      # Run Worker tests

# Deployment
bun run deploy:setup     # Set up infrastructure (DB + Vector)
bun run deploy:full      # Full deploy (build + Worker)
```

## Sprints Completed

✅ **Sprint 1**: Backend Foundation (4/4 features)
✅ **Sprint 2**: Signup Workflow (4/4 features)
✅ **Sprint 3**: Frontend Auth Migration (4/4 features)
✅ **Sprint 4**: Frontend Enhancements (6/6 features)
🔄 **Sprint 5**: Testing & Documentation (2/2 features)

**Total**: 20 features implemented across 5 sprints

## Contributing

This project follows a **test-driven development** approach:
1. Write tests first (before implementing features)
2. Use very granular feature branches (one feature = one branch)
3. Update `tasks/bridge.md` with timestamp after each commit
4. Follow the implementation plan in `~/.claude/plans/jaunty-coalescing-wand.md`

## License

[Add License Information]

## Support

For questions or issues:
- **GitHub Issues**: [Repository Issues](https://github.com/your-org/metacogna-rag/issues)
- **Documentation**: See `docs/` directory
- **User Guide**: See [USER_GUIDE.md](USER_GUIDE.md)

---

**Built with**: Cloudflare Workers, React, TypeScript, Tailwind CSS, Playwright
**Powered by**: Workers AI, Vectorize, D1, R2
