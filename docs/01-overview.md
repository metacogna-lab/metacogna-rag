# Metacogna Overview

## Introduction

Metacogna is an AI-powered platform that simulates human metacognition through a web of intelligent agents. It enables users to upload documents, interact with AI chatbots, and leverage multi-agent reasoning systems to extract insights, build knowledge graphs, and enhance cognitive workflows.

## Core Philosophy

Metacogna is built on the principle that **metacognition** - thinking about thinking - can be simulated and enhanced through structured agent interactions. By creating specialized agents that can coordinate, critique, and synthesize information, we create a system that mirrors human cognitive processes.

## Key Features

### 🤖 Multi-Agent System
- **Coordinator Agents**: Synthesize and build upon ideas
- **Critic Agents**: Question, refine, and identify inconsistencies
- **Memory System**: Short-term, medium-term, and long-term memory tiers
- **Stream-Based Processing**: Agents operate within isolated streams with cross-stream communication

### 📚 RAG (Retrieval Augmented Generation)
- Document ingestion with automatic chunking and embedding
- Vector search using Cloudflare Vectorize
- Context-aware responses based on uploaded knowledge base
- Support for multiple document formats

### 💬 Multi-Provider Chat
- Support for multiple LLM providers:
  - **OpenAI**: GPT-4o, GPT-4o Mini, GPT-5 (Preview)
  - **Google**: Gemini 3 Flash, Gemini 3 Pro
  - **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku
  - **Workers AI**: Cloudflare's native inference
- Provider and model selection per conversation
- Session management and chat history

### 📊 Knowledge Graph
- Automatic entity and relationship extraction
- Interactive graph visualization
- Graph-based analysis and insights
- Integration with document corpus

### 📁 Document Management
- Direct upload to Cloudflare R2 storage
- Automatic text extraction and processing
- Metadata management
- Document search and retrieval

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vite React)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Views   │  │Services │  │Components│  │  Types   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTP/API
                       │
┌──────────────────────▼──────────────────────────────────┐
│          Cloudflare Workers (Backend API)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │   Auth   │  │   RAG     │  │   Chat    │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└──────┬──────────┬──────────┬──────────┬──────────────┘
       │          │          │          │
       │          │          │          │
┌──────▼──┐ ┌─────▼────┐ ┌──▼──────┐ ┌─▼──────────┐
│   D1    │ │ Vectorize│ │   R2    │ │ Workers AI │
│(SQLite) │ │ (Vectors)│ │(Storage)│ │ (Inference)│
└─────────┘ └──────────┘ └─────────┘ └────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **UI Components**: Custom Paper Components, Lucide Icons
- **State Management**: React Hooks
- **Animation**: Framer Motion

### Backend
- **Runtime**: Cloudflare Workers
- **API**: RESTful endpoints
- **Authentication**: Custom D1-based auth

### Storage
- **Database**: Cloudflare D1 (SQLite)
- **Vector DB**: Cloudflare Vectorize
- **Object Storage**: Cloudflare R2 (S3-compatible)

### AI/ML
- **Embeddings**: Workers AI, OpenAI, Google
- **LLMs**: OpenAI, Google Gemini, Anthropic Claude, Workers AI
- **Observability**: Langfuse (optional)

## Application Views

Metacogna provides several specialized views:

1. **Landing Page**: Overview and navigation
2. **Upload View**: Document upload and ingestion
3. **Question View**: Chat interface with RAG
4. **Knowledge Graph View**: Interactive graph visualization
5. **Agent Canvas View**: Multi-agent simulation interface
6. **Prompt Gen View**: Prompt engineering tools
7. **Product X View**: Workflow-based product development
8. **Settings View**: Configuration and preferences
9. **Console View**: System logs and debugging

## Data Flow

1. **Document Upload**: User uploads document → Frontend → Worker → R2 storage
2. **Ingestion**: Worker extracts text → Chunks → Embeds → Stores in Vectorize + D1
3. **Query**: User asks question → Frontend → Worker → Vector search → LLM → Response
4. **Agent Processing**: Agent receives input → Accesses memory → Generates action → Updates state

## Design Principles

1. **Serverless First**: Everything runs on Cloudflare's edge network
2. **Multi-Provider**: Support for multiple LLM providers to avoid vendor lock-in
3. **Agent-Based**: Complex reasoning through specialized agent interactions
4. **Memory-Aware**: Agents maintain context across interactions
5. **Privacy-Focused**: User data stored securely, no unnecessary external calls

## Use Cases

- **Research & Knowledge Management**: Upload papers, articles, and documents for AI-assisted analysis
- **Learning & Education**: Build knowledge graphs from course materials
- **Product Development**: Use Product X workflow for structured ideation
- **Cognitive Simulation**: Experiment with agent-based reasoning
- **Prompt Engineering**: Test and optimize prompts across different models

## Next Steps

- Read the [Quick Start Guide](./02-quick-start.md) to get started
- Explore the [System Architecture](./architecture/01-system-architecture.md) for deeper understanding
- Check out [Feature Documentation](./features/) for detailed feature guides

