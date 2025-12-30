# Metacogna Documentation

Welcome to the Metacogna documentation. This documentation provides comprehensive guides for understanding, developing, and deploying the Metacogna application.

## What is Metacogna?

Metacogna is an AI-powered knowledge management and metacognitive simulation platform. It uses a web of intelligent agents to simulate human metacognition through interactions with chatbots, document analysis, and agent-based reasoning systems.

## Documentation Structure

### Getting Started
- **[Overview](./01-overview.md)** - Introduction to Metacogna, core concepts, and high-level architecture
- **[Quick Start Guide](./02-quick-start.md)** - Get up and running in minutes

### Architecture
- **[System Architecture](./architecture/01-system-architecture.md)** - High-level system design and component overview
- **[Frontend Architecture](./architecture/02-frontend-architecture.md)** - Vite React application structure
- **[Backend Architecture](./architecture/03-backend-architecture.md)** - Cloudflare Workers API design
- **[Storage Architecture](./architecture/04-storage-architecture.md)** - D1, R2, and Vectorize integration

### Features
- **[Agent System](./features/01-agent-system.md)** - Multi-agent metacognitive simulation
- **[RAG Engine](./features/02-rag-engine.md)** - Retrieval Augmented Generation
- **[Chat System](./features/03-chat-system.md)** - Conversational interface with multiple LLM providers
- **[Document Management](./features/04-document-management.md)** - Upload, ingest, and knowledge extraction
- **[Knowledge Graph](./features/05-knowledge-graph.md)** - Entity and relationship visualization

### Development
- **[Development Setup](./development/01-setup.md)** - Local development environment
- **[API Reference](./development/02-api-reference.md)** - Backend API endpoints
- **[Service Layer](./development/03-service-layer.md)** - Frontend service architecture
- **[Testing](./development/04-testing.md)** - Testing strategies and practices

### Deployment
- **[Deployment Overview](./deployment/01-overview.md)** - Cloudflare Pages deployment
- **[Storage Setup](./deployment/02-storage-setup.md)** - D1, R2, and Vectorize configuration
- **[Environment Configuration](./deployment/03-environment.md)** - Environment variables and secrets
- **[CI/CD](./deployment/04-cicd.md)** - Continuous integration and deployment

### Design Decisions
- **[Design Philosophy](./design/01-philosophy.md)** - Core principles and design choices
- **[Technology Stack](./design/02-technology-stack.md)** - Why we chose these technologies
- **[Data Flow](./design/03-data-flow.md)** - How data moves through the system

## Key Concepts

### Metacognition
Metacognition refers to "thinking about thinking" - the ability to understand, monitor, and control one's own cognitive processes. Metacogna simulates this through agent interactions.

### Agent Web
A network of specialized AI agents that work together to process information, reason about problems, and generate insights. Each agent has distinct roles (Coordinator, Critic, etc.) and can communicate with others.

### RAG (Retrieval Augmented Generation)
A technique that combines vector search with LLM generation to provide contextually relevant responses based on uploaded documents.

## Contributing

When contributing to Metacogna, please refer to the relevant documentation sections and follow the established patterns and conventions.

## Support

For questions or issues, please refer to the specific documentation sections or open an issue in the repository.

