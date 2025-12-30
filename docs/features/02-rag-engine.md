# RAG Engine

## Overview

The RAG (Retrieval Augmented Generation) Engine is Metacogna's core knowledge retrieval system. It combines vector search with LLM generation to provide contextually relevant responses based on uploaded documents.

## What is RAG?

RAG enhances LLM responses by:
1. **Retrieving** relevant context from a knowledge base
2. **Augmenting** the LLM prompt with this context
3. **Generating** responses grounded in the retrieved information

This approach allows LLMs to answer questions about specific documents and domains without requiring fine-tuning.

## Architecture

```
┌─────────────────────────────────────────────────┐
│              User Query                          │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         Query Embedding                         │
│  (Workers AI or External Provider)              │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         Vector Search (Vectorize)                │
│  • Cosine similarity search                     │
│  • Top-k retrieval                              │
│  • Metadata filtering                            │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         Context Construction                    │
│  • Combine retrieved chunks                     │
│  • Add document metadata                        │
│  • Format for LLM                              │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         LLM Generation                          │
│  • Prompt with context                          │
│  • Multi-provider support                       │
│  • Response generation                          │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│              Response                            │
└─────────────────────────────────────────────────┘
```

## Document Ingestion

### Process Flow

1. **Upload**: User uploads document to R2
2. **Text Extraction**: Worker extracts text from file
3. **Chunking**: Text split into manageable chunks
4. **Embedding**: Each chunk embedded into vector space
5. **Storage**: Vectors stored in Vectorize, metadata in D1

### Chunking Strategy

**Configuration**:
- **Chunk Size**: 512 characters
- **Overlap**: 50 characters (configurable)
- **Method**: Fixed-size chunks with overlap

**Rationale**:
- 512 chars balances context and granularity
- Overlap prevents information loss at boundaries
- Fixed size ensures consistent embedding dimensions

### Embedding Generation

**Model**: BGE-base-en-v1.5 (via Workers AI)
- **Dimensions**: 768
- **Language**: English optimized
- **Quality**: High-quality semantic embeddings

**Alternative Providers**:
- OpenAI: `text-embedding-3-small` or `text-embedding-3-large`
- Google: `text-embedding-004`

### Vector Storage

**Vectorize Index**:
- Stores embeddings with metadata
- Enables fast similarity search
- Supports metadata filtering

**Metadata Stored**:
- Document ID
- Title
- Chunk content
- Chunk index
- Additional document metadata

## Query Processing

### Step 1: Query Embedding

```typescript
// Embed user query
const queryEmbedding = await generateEmbedding(query);
```

**Options**:
- Workers AI (default)
- OpenAI embeddings
- Google embeddings

### Step 2: Vector Search

```typescript
// Search Vectorize for similar chunks
const results = await env.VECTOR_INDEX.query(queryEmbedding, {
  topK: 5,
  returnMetadata: true
});
```

**Parameters**:
- `topK`: Number of results (default: 5)
- `returnMetadata`: Include chunk metadata
- `filter`: Optional metadata filtering

### Step 3: Context Construction

```typescript
// Build context from retrieved chunks
const context = results.matches
  .map(match => `[${match.metadata.title}]\n${match.metadata.content}`)
  .join('\n\n---\n\n');
```

**Format**:
- Document title as header
- Chunk content
- Separators between chunks
- Source attribution

### Step 4: LLM Generation

```typescript
// Construct prompt with context
const prompt = `Based on the following context, answer the question.

Context:
${context}

Question: ${query}

Answer:`;

// Call LLM
const response = await callLLM(prompt, {
  provider: 'openai',
  model: 'gpt-4o-mini',
  temperature: 0.3
});
```

## RAGEngine Service

### Key Methods

**`ingest(document, content, llmConfig)`**
- Ingests a document into the knowledge base
- Chunks, embeds, and stores content
- Returns number of chunks created

**`chat(query, config, sessionId?)`**
- Processes a chat query with RAG
- Retrieves relevant context
- Generates response
- Stores in chat history

**`search(query, topK?)`**
- Performs vector search only
- Returns relevant chunks
- No LLM generation

### Configuration

```typescript
const CONFIG = {
  chunkSize: 512,
  overlap: 50,
  vectorDimensions: 768,
  rateLimitRPM: 10,
  workerUrl: '/api'
};
```

## Multi-Provider Support

### Embedding Providers

**Workers AI** (Default)
- Fast, no API key required
- BGE-base-en-v1.5 model
- Free tier available

**OpenAI**
- High-quality embeddings
- Multiple model options
- Requires API key

**Google**
- Gemini embeddings
- Good for multilingual
- Requires API key

### LLM Providers

**OpenAI**
- GPT-4o, GPT-4o Mini, GPT-5
- High quality, fast
- Structured output support

**Google**
- Gemini 3 Flash, Gemini 3 Pro
- Good for long context
- Multimodal support

**Anthropic**
- Claude 3.5 Sonnet, Claude 3 Haiku
- Strong reasoning
- Long context windows

**Workers AI**
- Cloudflare's native LLM
- No API key required
- Edge-optimized

## Knowledge Graph Integration

### Graph Extraction

During ingestion, the RAG engine also extracts a knowledge graph:

```typescript
// Extract entities and relationships
const graphPrompt = `
Extract the knowledge graph from the text below.
Identify key "nodes" (Concepts, Technologies, People, Organizations) 
and "edges" (relationships between them).
Output strictly valid JSON...
`;
```

**Output**:
- Nodes: Entities with types and summaries
- Edges: Relationships between entities
- Stored in D1 for visualization

## Session Management

### Chat Sessions

- Each conversation is a session
- Messages linked to session
- Session metadata stored in D1
- History retrieval for context

### Context Window

- Previous messages included in context
- Configurable message history
- Token limit management
- Truncation for long conversations

## Performance Optimization

### Caching

- Embedding results cached
- Frequent queries cached
- Vector search results cached

### Batch Operations

- Batch embedding generation
- Batch vector upserts
- Reduced API calls

### Rate Limiting

- Configurable rate limits
- Prevents API abuse
- Smooth user experience

## Error Handling

### Embedding Failures

- Fallback to alternative provider
- Retry logic
- Graceful degradation

### Vector Search Failures

- Error logging
- Fallback to keyword search
- User-friendly messages

### LLM Failures

- Retry with exponential backoff
- Provider fallback
- Error messages to user

## Use Cases

### Document Q&A

Users can ask questions about uploaded documents:
- "What are the main points in this document?"
- "Explain the methodology section"
- "What are the key findings?"

### Knowledge Base Search

Search across multiple documents:
- "What do the documents say about X?"
- "Compare approaches in documents A and B"
- "Find all mentions of Y"

### Contextual Assistance

Get help based on document context:
- "How do I implement this?"
- "What are the best practices?"
- "What should I do next?"

## Best Practices

### Document Quality

- Use well-structured documents
- Clear headings and sections
- Good formatting improves chunking

### Query Formulation

- Be specific in queries
- Reference document content
- Ask focused questions

### Chunk Size

- Balance context and granularity
- Adjust based on document type
- Consider overlap size

### Top-K Selection

- Start with 5 chunks
- Increase for complex queries
- Decrease for focused questions

## Next Steps

- [Chat System](./03-chat-system.md) - Chat interface implementation
- [Document Management](./04-document-management.md) - Upload and processing
- [Knowledge Graph](./05-knowledge-graph.md) - Graph visualization

