# Chat Endpoint Migration

The chat functionality has been refactored to use a secure `/api/chat` endpoint in the Cloudflare Worker.

## Changes Made

### 1. Worker Endpoint (`/api/chat`)
- **Location**: `worker/src/index.ts`
- **Method**: POST
- **Functionality**:
  - Performs vector search if sources not provided
  - Builds RAG context from retrieved sources
  - Calls LLM (Workers AI or external providers)
  - Returns response with sources and metadata

### 2. Frontend Updates
- **RAGEngine**: Updated `generateRAGResponse()` to use `/api/chat` endpoint
- **Fallback**: Still supports local LLM service if worker unavailable
- **QuestionView**: No changes needed (uses RAGEngine)

### 3. Security Improvements
- API keys moved to worker environment (secrets)
- No API keys exposed in frontend code
- Centralized LLM calls through worker

## API Endpoint

### POST `/api/chat`

**Request Body:**
```typescript
{
  query: string;                    // User's question
  sources?: Source[];               // Optional: pre-retrieved sources
  llmConfig?: {                    // Optional: LLM configuration
    provider: 'workers-ai' | 'google' | 'openai' | 'anthropic';
    model: string;
    maxTokens?: number;
  };
  systemPrompt?: string;            // Optional: system instruction
  temperature?: number;             // Default: 0.2
  historyContext?: string;          // Optional: chat history
  userGoals?: string;              // Optional: user goals
  topK?: number;                    // Default: 5 (for search)
}
```

**Response:**
```typescript
{
  response: string;                // LLM generated response
  sources: Source[];               // Retrieved sources
  provider: string;                // LLM provider used
  model: string;                   // Model used
}
```

## Environment Setup

### Setting API Keys (Secrets)

API keys should be set as **secrets** (not in `wrangler.toml`):

```bash
# Set Google API key (optional)
bun wrangler secret put GEMINI_API_KEY

# Set OpenAI API key (optional)
bun wrangler secret put OPENAI_API_KEY

# Set Anthropic API key (optional)
bun wrangler secret put ANTHROPIC_API_KEY
```

### Default Behavior

- **No API keys set**: Uses Cloudflare Workers AI (free, no keys needed)
- **API keys set**: Can use external providers (Google, OpenAI, Anthropic)

## Usage Example

```typescript
import { apiPost } from './services/ApiClient';

const result = await apiPost('/chat', {
  query: 'What is artificial intelligence?',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.2,
  userGoals: 'Learn about technology',
  historyContext: 'Previous conversation context...'
});

console.log(result.response);  // LLM response
console.log(result.sources);   // Retrieved documents
```

## Benefits

1. **Security**: API keys never exposed to frontend
2. **Cost Control**: Centralized rate limiting and usage tracking
3. **Flexibility**: Easy to switch between LLM providers
4. **Performance**: Single request for search + generation
5. **Consistency**: All API calls go through worker

## Testing

All tests pass:
- ✅ Chat endpoint returns response with sources
- ✅ Uses provided sources when available
- ✅ Includes history context in prompt
- ✅ Handles different LLM providers

Run tests: `bun test:worker`

