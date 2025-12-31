# MetaCogna RAG User Guide

Complete user guide for the MetaCogna RAG system with admin-only access model.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Access Control Model](#access-control-model)
- [Authentication](#authentication)
- [User Roles](#user-roles)
- [Admin Workflows](#admin-workflows)
- [User Workflows](#user-workflows)
- [Features Guide](#features-guide)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Getting Started

### First-Time Setup

MetaCogna RAG uses an **admin-only access model**. New users cannot self-register. Contact your system administrator to create an account.

**Prerequisites**:
- Username and password provided by administrator
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection

**Login URL**:
- Local: `http://localhost:3000`
- Production: `https://your-domain.com`

---

## Access Control Model

### Key Principles

1. **No Self-Registration**: Users cannot create their own accounts
2. **Admin-Controlled Onboarding**: Only administrators can create user accounts
3. **Guest Access**: Login-only interface (no signup button)
4. **Cookie-Based Sessions**: 7-day session expiry, secure HttpOnly cookies
5. **Worker-Based Authentication**: No localStorage for credentials (all auth via Worker)

### Why Admin-Only?

**Security**: Prevents unauthorized account creation
**Quality Control**: Ensures users have proper context and goals
**Personalization**: Admin collects user goals during signup for MetaCogna agent

---

## Authentication

### Login Process

1. Navigate to login page
2. Enter **username** (provided by admin)
3. Enter **password** (provided by admin)
4. Click **"Sign In"**
5. Session cookie set (7 days expiry)

**Login Screen Elements**:
- **Title**: "Worker Auth • SHA-256" (indicates secure authentication)
- **ID Field**: Enter your username
- **Secret Field**: Enter your password
- **Sign In Button**: Submit credentials
- **No Account Message**: "Account creation is restricted to authorized personnel"

### Session Management

**Session Duration**: 7 days
**Cookie Name**: `pratejra_session`
**Cookie Properties**: HttpOnly, Secure, Path=/

**Automatic Logout**: After 7 days of inactivity
**Manual Logout**: Click your username → Logout (if implemented)

### Password Security

- Passwords hashed with **SHA-256** before transmission
- Hash format: `SHA256(username + password)`
- Never stored or transmitted in plain text
- Admin cannot view your password after account creation

---

## User Roles

### Administrator

**Capabilities**:
- ✅ Create new user accounts
- ✅ Upload and manage documents
- ✅ Access knowledge graph
- ✅ Use prompt engineering lab
- ✅ Manage settings (API keys, models)
- ✅ Perform document maintenance (reindex, purge)
- ✅ View all standard user features

**Identifying Admins**:
- "Create User" button visible in top navigation
- Badge displays: "Worker Auth • SHA-256"

### Standard User

**Capabilities**:
- ✅ Upload and manage documents
- ✅ Access knowledge graph
- ✅ Use prompt engineering lab
- ✅ Manage settings (API keys, models)
- ✅ Perform document maintenance (reindex, purge)
- ❌ **Cannot** create new user accounts

**Identifying Standard Users**:
- No "Create User" button visible
- No admin-specific UI elements

---

## Admin Workflows

### Creating a New User

**Prerequisites**: Admin account required

**Steps**:
1. **Login** as administrator
2. **Click** "Create User" button (top navigation)
3. **Fill Signup Form**:
   - **Full Name**: User's full name (required)
   - **Email**: Unique email address (required)
   - **Password**: Secure password (required, min 8 chars recommended)
   - **User Goals**: Describe user's objectives (required)
   - **Initial Files**: Upload starting documents (optional, .md/.pdf/.txt)
4. **Review Instructions**: "Goals are monitored by the MetaCogna agent to personalize interactions"
5. **Click** "Create User"
6. **Success**: User created, goals summarized, files uploaded

**Form Validation**:
- All fields except "Initial Files" are required
- Email must be unique (no duplicates)
- Password minimum length enforced
- File types: .md, .pdf, .txt only
- Multiple files supported

**After User Creation**:
- Provide username and password to new user
- User can login immediately
- Initial documents appear in their document list
- Goals visible in user profile (personalization)

**Example User Goals**:
```
Learn RAG systems and build a knowledge base for research papers.
Understand vector databases, embeddings, and semantic search.
Explore prompt engineering techniques for better LLM responses.
```

**Goals Summarization**:
- AI-powered summarization (Workers AI)
- Max 200 characters
- Displayed in user profile
- Used by MetaCogna agent for personalization

---

## User Workflows

### Logging In

1. Open MetaCogna RAG in browser
2. Enter username (provided by admin)
3. Enter password (provided by admin)
4. Click "Sign In"
5. Dashboard loads automatically

**If Login Fails**:
- Check username and password for typos
- Ensure Caps Lock is off
- Contact administrator if forgotten password

### Uploading Documents

1. **Navigate** to "Documents" view
2. **Click** "Upload" or drag-drop files into upload area
3. **Select Files** (.md, .pdf, .txt) - multiple files supported
4. **Monitor Progress**:
   - **Chunking (0-29%)**: Blue progress bar
   - **Embedding (30-59%)**: Purple progress bar
   - **Graph Extraction (60-89%)**: Indigo progress bar
   - **Finalizing (90-100%)**: Emerald progress bar
5. **View Status**: "Indexed" badge when complete

**Document Table**:
- **Title**: Document filename
- **Uploaded**: Date and time
- **Status**: processing, indexed, error
- **Chunks**: Number of semantic chunks
- **Metadata**: Author, category, tags (hover for full metadata)

**Metadata Tooltips**:
- Hover over metadata badges to see full details
- Shows up to 3 fields by default
- "..." indicates more fields available
- Tooltip displays all metadata on hover

### Searching Documents

1. **Navigate** to "Chat" or "Search" view
2. **Enter Query**: Natural language question or keywords
3. **Click** "Search"
4. **Review Results**: Ranked by semantic similarity
5. **Click Result**: View full context and source document

**Search Features**:
- **Semantic Search**: Finds meaning, not just keywords
- **Vector Embeddings**: 768-dimensional similarity matching
- **Ranked Results**: Highest similarity scores first
- **Source Attribution**: Links to original documents

### Using the Knowledge Graph

1. **Navigate** to "Knowledge Graph" view
2. **Explore Nodes**: Concepts, technologies, people, documents
3. **View Relationships**: Edges showing connections
4. **Search Nodes**: Find specific entities or concepts
5. **Zoom/Pan**: Navigate large graphs

**Node Types**:
- **Concept** (blue): Abstract ideas, techniques
- **Technology** (green): Tools, frameworks, libraries
- **Person** (orange): Authors, researchers, organizations
- **Document** (purple): Source documents

**Relationship Types**:
- **uses**: Technology usage
- **relates**: Conceptual relationship
- **authored_by**: Authorship
- **mentions**: Reference or mention

### Prompt Engineering Lab

1. **Navigate** to "Prompt Lab" view
2. **Choose Template** (optional):
   - **RAG Query**: For semantic search prompts
   - **Code Review**: For code analysis
   - **Goal Analysis**: For strategic planning
3. **Edit Prompt** in textarea
4. **Insert Variables** (click buttons):
   - `{{context}}`: Retrieved knowledge base context
   - `{{query}}`: User's question or input
   - `{{code}}`: Code to analyze
   - `{{focus}}`: Review focus area
   - `{{goal}}`: Goal to analyze
5. **Click** "Generate Prompt"
6. **Review** AI-optimized prompt
7. **Save to Library** for reuse

**Template Features**:
- **Icon + Description**: Visual template selector
- **3-Column Grid**: Easy browsing
- **Clear Template**: Reset to blank prompt
- **Variable Interpolation**: Insert placeholders at cursor

**Use Cases**:
- Optimize RAG queries for better retrieval
- Create code review checklists
- Break down complex goals into actionable steps

### Configuring Settings

1. **Navigate** to "Settings" view
2. **Select Model Provider**:
   - OpenAI (GPT-4o, GPT-4o Mini, o1)
   - Anthropic (Claude 3.5 Sonnet/Haiku)
   - Google (Gemini 2.0 Flash, 1.5 Pro/Flash)
   - Ollama (Llama 3.2, Mistral Nemo - local)
   - Workers AI (Llama 3/3.1, Mistral, Qwen, DeepSeek)
3. **Enter API Keys**:
   - OpenAI API Key (if using OpenAI)
   - Anthropic API Key (if using Anthropic)
   - Google API Key (if using Google)
   - Ollama URL (if using Ollama)
   - Workers AI Key (if using Workers AI)
4. **Click** "Update API Keys" to save
5. **Adjust Temperature** (0.0-1.0):
   - 0.0: Deterministic, factual
   - 0.5: Balanced
   - 1.0: Creative, exploratory
6. **Success Message**: "API keys saved successfully!"

**API Key Storage**:
- Stored in browser localStorage (client-side only)
- Not sent to server
- Encrypted in transit when used
- Clear browser data to remove

### Document Maintenance

**Reindex All Documents**:
1. **Navigate** to "Documents" view
2. **Click** "Reindex All Documents"
3. **Confirm** action (cannot be undone during processing)
4. **Wait**: All documents re-processed (chunking, embedding, graph)
5. **Success**: "All documents reindexed successfully!"

**When to Reindex**:
- After major system updates
- If search results seem outdated
- After changing embedding model
- If knowledge graph is incomplete

**Purge Error Documents**:
1. **Navigate** to "Documents" view
2. **Review** error documents (red "error" badge)
3. **Click** "Purge Error Documents"
4. **Confirm** action (cannot be undone)
5. **Success**: "Purged X error document(s)"

**When to Purge**:
- After fixing upload issues
- To clean up failed uploads
- Before re-uploading corrected files

---

## Features Guide

### Paper UI Theme

**Visual Style**:
- Clean, minimal design
- High contrast for readability
- Sharp corners (no rounded edges)
- Paper-like aesthetic

**Components**:
- **PaperCard**: White cards with gray borders
- **PaperButton**: Solid ink-colored buttons
- **PaperInput**: Clean input fields
- **PaperBadge**: Status indicators (blue, green, red)

### Pipeline Stages Visualization

**4-Stage Process**:
1. **Chunking (0-29%)** - Blue
   - Document text splitting into semantic chunks
   - Preserves sentence boundaries
   - Configurable chunk size (default: 500 chars)

2. **Embedding (30-59%)** - Purple
   - Vector embedding generation (768 dimensions)
   - Uses Cloudflare Vectorize
   - Cosine similarity matching

3. **Graph Extraction (60-89%)** - Indigo
   - Entity recognition (concepts, people, tech)
   - Relationship extraction
   - Knowledge graph construction

4. **Finalizing (90-100%)** - Emerald
   - Final indexing
   - Metadata updates
   - Status change to "indexed"

**Visual Indicators**:
- **Animated Stripes**: Diagonal moving stripes during processing
- **Percentage Display**: Real-time progress (0-100%)
- **Color Coding**: Each stage has distinct color
- **Stage Label**: Current stage name displayed

### Metadata System

**Supported Metadata Fields**:
- **author**: Document author
- **category**: Document category (Research, Engineering, etc.)
- **tags**: Comma-separated keywords
- **date**: Publication date
- **source**: Document source or URL
- **custom**: Any custom field (JSON)

**Metadata Display**:
- **Badges**: Up to 3 fields shown as badges
- **Truncation**: Fields truncated to 80 chars max
- **Hover Tooltip**: Full metadata on hover
- **group-hover**: CSS-based tooltip (no JavaScript)

**Adding Metadata**:
- Include in file frontmatter (Markdown)
- Add via API during upload
- Edit after upload (future feature)

---

## Troubleshooting

### Login Issues

**"Invalid credentials" Error**:
- Check username and password for typos
- Ensure Caps Lock is off
- Contact admin for password reset

**Session Expired**:
- Login again (sessions expire after 7 days)
- Browser cleared cookies
- Use "Remember Me" if available

### Upload Failures

**"Upload failed" Error**:
- Check file size (max 10MB recommended)
- Verify file type (.md, .pdf, .txt only)
- Check internet connection
- Try uploading fewer files at once

**Stuck at "Processing"**:
- Wait 5-10 minutes (large files take time)
- Refresh page to check status
- Contact admin if stuck > 30 minutes

**"Error" Status Badge**:
- Click "Purge Error Documents" to remove
- Re-upload file with corrections
- Check file encoding (UTF-8 recommended)

### Search Issues

**No Results Found**:
- Try broader search terms
- Ensure documents are fully indexed (100%)
- Check that relevant documents are uploaded
- Use semantic search (meaning, not keywords)

**Irrelevant Results**:
- Refine query with more specific terms
- Adjust similarity threshold (if available)
- Check document metadata for relevance

### Graph Issues

**Missing Nodes**:
- Ensure documents are fully indexed (100%)
- Click "Reindex All Documents" to refresh graph
- Check document content for entities

**Too Many Nodes**:
- Use search to filter nodes
- Focus on specific node types (Concept, Technology, etc.)
- Zoom in to explore specific clusters

---

## FAQ

### General

**Q: How do I create an account?**
A: Only administrators can create accounts. Contact your admin to request access.

**Q: Can I change my password?**
A: Password change feature is not yet implemented. Contact your admin for a password reset.

**Q: How long do sessions last?**
A: 7 days. After 7 days of inactivity, you'll need to login again.

### Documents

**Q: What file types are supported?**
A: Markdown (.md), PDF (.pdf), and plain text (.txt).

**Q: What's the maximum file size?**
A: No hard limit, but files > 10MB may take longer to process.

**Q: How do I delete a document?**
A: Delete feature coming soon. Contact admin for manual deletion.

**Q: Can I edit document metadata?**
A: Metadata editing coming soon. Include metadata in file frontmatter on upload.

### Search & Graph

**Q: What's the difference between search and knowledge graph?**
A: Search finds relevant content chunks. Graph shows relationships between entities.

**Q: How accurate is semantic search?**
A: Very accurate for meaning-based queries. Uses 768-dimensional embeddings.

**Q: Can I export the knowledge graph?**
A: Export feature coming soon. Contact admin for manual export.

### Prompt Lab

**Q: What models power the Prompt Lab?**
A: Gemini 2.0 Flash by default. Configurable in Settings.

**Q: Can I save custom templates?**
A: Yes! Click "Save to Library" after generating a prompt.

**Q: What are variables ({{context}}, {{query}})?**
A: Placeholders for dynamic content. Replaced at runtime with actual values.

### Admin

**Q: How do I become an admin?**
A: Only the system owner can grant admin access. Contact the system owner.

**Q: Can I revoke a user's access?**
A: User deletion feature coming soon. Contact system owner for manual removal.

**Q: Can I view other users' documents?**
A: No. Documents are private to each user (isolated by userId).

---

## Getting Help

**Support Channels**:
- **Administrator**: Contact your system admin for account or access issues
- **GitHub Issues**: Report bugs at [Repository Issues](https://github.com/your-org/metacogna-rag/issues)
- **Documentation**: See `docs/` directory for technical docs
- **API Reference**: See [deployment/API_REFERENCE.md](deployment/API_REFERENCE.md)

**What to Include in Support Requests**:
- Username (no passwords!)
- Browser and version
- Error message (screenshot or text)
- Steps to reproduce the issue
- Expected vs actual behavior

---

**Last Updated**: 2025-12-31
**Version**: 2.0.0
**Platform**: Cloudflare Workers + React
