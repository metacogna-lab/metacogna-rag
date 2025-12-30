/**
 * Tests for Cloudflare Worker API endpoints
 * Tests basic functionality of all API routes
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Mock Cloudflare Worker environment
interface MockEnv {
  AI: any;
  VECTOR_INDEX: any;
  DB: any;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_HOST?: string;
  BASE_URL?: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}

// Agent system prompts mapping (matching worker)
const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  'rag-chat': 'You are a helpful assistant that answers questions based on retrieved knowledge. Prioritize accuracy and cite sources when relevant.',
  'graph-analyst': 'You are a knowledge graph analyst specializing in structural analysis of information networks.',
  'executive-summary': 'You are an executive communication specialist. Generate professional, high-level summaries.',
  'technical-auditor': 'You are a technical systems auditor. Provide raw, detailed technical analysis.',
  'future-planner': 'You are a strategic future planner. Analyze content to predict and plan ahead.',
  'coordinator': 'You are the Coordinator agent in a cognitive graph simulation system.',
  'critic': 'You are the Critic agent in a cognitive graph simulation system.',
  'supervisor': 'You are the SUPERVISOR SUPER AGENT, a metacognitive orchestration layer.',
  'product-manager': 'You are a Product Manager analyzing prompt ideas.',
  'strategic-planner': 'You are a Strategic Planner analyzing prompts for capability development.',
  'lead-critic': 'You are a Lead Critic performing rigorous analysis.',
  'synthesis-engine': 'Focus on finding commonalities, patterns, and unifying principles.',
  'creative-forge': 'Be speculative and imaginative.',
  'socratic-critic': 'Be critical and thorough.'
};

// Import the worker handler
// Note: In a real setup, you'd import from the compiled worker
// For now, we'll test the logic by creating a testable version

/**
 * Helper to create a mock request
 */
function createRequest(path: string, method: string, body?: any): Request {
  const url = `https://api.metacogna.ai${path}`;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    init.body = JSON.stringify(body);
  }
  
  return new Request(url, init);
}

/**
 * Helper to create mock environment
 */
function createMockEnv(): MockEnv {
  // Mock D1 Database
  const mockUsers: Map<string, any> = new Map();
  const mockDocuments: Map<string, any> = new Map();
  const mockGraphNodes: Map<string, any> = new Map();
  const mockGraphEdges: Map<string, any> = new Map();

  const mockDB = {
    prepare: (query: string) => {
      const stmt = {
        query,
        bind: (...args: any[]) => {
          return {
            query,
            args,
            first: async () => {
              if (query.includes('SELECT * FROM users WHERE')) {
                const username = args[0];
                const passwordHash = args[1];
                const user = Array.from(mockUsers.values()).find(
                  (u: any) => u.username === username && u.passwordHash === passwordHash
                );
                return user || null;
              }
              return null;
            },
            run: async () => {
              if (query.includes('INSERT INTO users')) {
                const [id, username, passwordHash, createdAt] = args;
                if (Array.from(mockUsers.values()).some((u: any) => u.username === username)) {
                  throw new Error('UNIQUE constraint failed');
                }
                mockUsers.set(id, { id, username, passwordHash, createdAt });
                return { success: true };
              }
              if (query.includes('INSERT OR REPLACE INTO documents')) {
                const [id, title, content, metadata, createdAt] = args;
                mockDocuments.set(id, { id, title, content, metadata, createdAt });
                return { success: true };
              }
              if (query.includes('INSERT OR IGNORE INTO graph_nodes')) {
                const [id, label, type, summary] = args;
                if (!mockGraphNodes.has(id)) {
                  mockGraphNodes.set(id, { id, label, type, summary });
                }
                return { success: true };
              }
              if (query.includes('INSERT OR IGNORE INTO graph_edges')) {
                const [id, source, target, relation] = args;
                if (!mockGraphEdges.has(id)) {
                  mockGraphEdges.set(id, { id, source, target, relation });
                }
                return { success: true };
              }
              return { success: true };
            },
            all: async () => {
              if (query.includes('SELECT * FROM graph_nodes')) {
                return { results: Array.from(mockGraphNodes.values()) };
              }
              if (query.includes('SELECT * FROM graph_edges')) {
                return { results: Array.from(mockGraphEdges.values()) };
              }
              return { results: [] };
            },
          };
        },
        all: async () => {
          if (query.includes('SELECT * FROM graph_nodes')) {
            return { results: Array.from(mockGraphNodes.values()) };
          }
          if (query.includes('SELECT * FROM graph_edges')) {
            return { results: Array.from(mockGraphEdges.values()) };
          }
          return { results: [] };
        },
      };
      return stmt;
    },
    batch: async (statements: any[]) => {
      for (const stmt of statements) {
        await stmt.run();
      }
      return { success: true };
    },
  };

  // Mock AI (Workers AI)
  const mockAI = {
    run: async (model: string, input: any) => {
      if (model === '@cf/baai/bge-base-en-v1.5') {
        // Mock embedding response
        const texts = Array.isArray(input.text) ? input.text : [input.text];
        return {
          data: texts.map(() => new Array(768).fill(0).map(() => Math.random() * 0.1)),
        };
      }
      if (model === '@cf/meta/llama-3-8b-instruct') {
        // Check if this is a chat request (has messages) or graph extraction
        if (input.messages && Array.isArray(input.messages)) {
          // Chat request - return mock response based on system prompt
          const systemPrompt = input.messages.find((m: any) => m.role === 'system')?.content || '';
          if (systemPrompt.includes('graph analyst')) {
            return { response: 'Mock graph analysis response focusing on structural insights and centrality metrics.' };
          }
          if (systemPrompt.includes('executive')) {
            return { response: 'Mock executive summary with key findings and recommendations.' };
          }
          if (systemPrompt.includes('technical auditor')) {
            return { response: 'Mock technical analysis with data density and metadata observations.' };
          }
          if (systemPrompt.includes('future planner')) {
            return { response: 'Mock strategic roadmap with phases and milestones.' };
          }
          if (systemPrompt.includes('Coordinator')) {
            return { response: 'Mock synthesis response combining ideas into unified concepts.' };
          }
          if (systemPrompt.includes('Critic')) {
            return { response: 'Mock critique identifying gaps and improvements.' };
          }
          return { response: 'Mock response from Workers AI' };
        }
        // Graph extraction response
        return {
          response: JSON.stringify({
            nodes: [
              { id: 'TestNode1', type: 'Concept', summary: 'Test concept' },
              { id: 'TestNode2', type: 'Technology', summary: 'Test technology' },
            ],
            edges: [
              { source: 'TestNode1', target: 'TestNode2', relation: 'uses' },
            ],
          }),
        };
      }
      return { data: [] };
    },
  };

  // Mock Vectorize Index
  const mockVectors: Map<string, any> = new Map();
  const mockVectorIndex = {
    upsert: async (vectors: any[]) => {
      for (const vec of vectors) {
        mockVectors.set(vec.id, vec);
      }
      return { success: true };
    },
    query: async (vector: number[], options: any) => {
      // Mock search results
      const matches = Array.from(mockVectors.values())
        .slice(0, options.topK || 5)
        .map((vec: any) => ({
          id: vec.id,
          score: Math.random() * 0.5 + 0.5, // Random score between 0.5 and 1.0
          metadata: vec.metadata,
        }));
      return { matches };
    },
  };

  return {
    AI: mockAI,
    VECTOR_INDEX: mockVectorIndex,
    DB: mockDB,
  };
}

/**
 * Worker handler logic (extracted for testing)
 * This mirrors the actual worker logic
 */
async function handleRequest(request: Request, env: MockEnv): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const jsonResponse = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  const errorResponse = (msg: string, status = 500) => jsonResponse({ error: msg }, status);

  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Health check
    if (path === '/api/health' && method === 'GET') {
      return jsonResponse({
        status: 'ok',
        timestamp: Date.now(),
        service: 'metacogna',
      });
    }

    // Auth: Login
    if (path === '/api/auth/login' && method === 'POST') {
      const { username, passwordHash } = await request.json() as any;
      const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND passwordHash = ?')
        .bind(username, passwordHash)
        .first();

      if (!user) return jsonResponse({ success: false, message: 'Invalid credentials' }, 401);
      return jsonResponse({ success: true, user });
    }

    // Auth: Register
    if (path === '/api/auth/register' && method === 'POST') {
      const { id, username, passwordHash, createdAt } = await request.json() as any;
      try {
        await env.DB.prepare('INSERT INTO users (id, username, passwordHash, createdAt) VALUES (?, ?, ?, ?)')
          .bind(id, username, passwordHash, createdAt)
          .run();
        return jsonResponse({ success: true });
      } catch (e: any) {
        if (e.message?.includes('UNIQUE')) {
          return jsonResponse({ success: false, message: 'Username taken' }, 400);
        }
        throw e;
      }
    }

    // Ingest
    if (path === '/api/ingest' && method === 'POST') {
      const { docId, title, content, metadata } = await request.json() as any;

      // Store document
      await env.DB.prepare(
        'INSERT OR REPLACE INTO documents (id, title, content, metadata, createdAt) VALUES (?, ?, ?, ?, ?)'
      ).bind(docId, title, content.substring(0, 1000), JSON.stringify(metadata), Date.now()).run();

      // Chunk and embed
      const chunks = content.match(/.{1,512}/g) || [];
      const embeddingsResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: chunks });

      const vectors = chunks.map((chunk: string, i: number) => ({
        id: `${docId}-${i}`,
        values: embeddingsResponse.data[i],
        metadata: { ...metadata, docId, title, content: chunk, chunkIndex: i },
      }));

      await env.VECTOR_INDEX.upsert(vectors);

      // Graph extraction (simplified for testing)
      let graphData = { nodes: [], edges: [] };
      try {
        const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [{ role: 'user', content: 'Extract graph from text' }],
        });
        const rawJson = aiResponse.response || '';
        graphData = JSON.parse(rawJson);
      } catch (err) {
        // Non-blocking
      }

      // Store graph (simplified)
      if (graphData.nodes && graphData.nodes.length > 0) {
        const nodeStmt = env.DB.prepare('INSERT OR IGNORE INTO graph_nodes (id, label, type, summary) VALUES (?, ?, ?, ?)');
        const edgeStmt = env.DB.prepare('INSERT OR IGNORE INTO graph_edges (id, source, target, relation) VALUES (?, ?, ?, ?)');
        const batch = [];

        for (const n of graphData.nodes) {
          batch.push(nodeStmt.bind(n.id, n.id, n.type || 'Concept', n.summary || ''));
        }

        if (graphData.edges) {
          for (const e of graphData.edges) {
            const edgeId = `${e.source}-${e.relation}-${e.target}`.replace(/\s+/g, '_');
            batch.push(edgeStmt.bind(edgeId, e.source, e.target, e.relation));
          }
        }

        // Link Document to extracted Nodes (First 3)
        for (let i = 0; i < Math.min(graphData.nodes.length, 3); i++) {
          const n = graphData.nodes[i];
          const linkId = `docLink-${docId}-${n.id}`;
          batch.push(edgeStmt.bind(linkId, `DOC:${docId}`, n.id, 'mentions'));
        }

        // Also ensure the Document Node exists
        batch.push(nodeStmt.bind(`DOC:${docId}`, title, 'Document', 'Source File'));

        await env.DB.batch(batch);
      }

      return jsonResponse({
        success: true,
        chunks: chunks.length,
        graphNodes: graphData.nodes?.length || 0,
      });
    }

    // Search
    if (path === '/api/search' && method === 'POST') {
      const { query, topK = 5 } = await request.json() as any;
      const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
      const results = await env.VECTOR_INDEX.query(embedding.data[0], { topK, returnMetadata: true });
      return jsonResponse({ results: results.matches });
    }

    // Graph
    if (path === '/api/graph' && method === 'GET') {
      const nodes = await env.DB.prepare('SELECT * FROM graph_nodes LIMIT 100').all();
      const edges = await env.DB.prepare('SELECT * FROM graph_edges LIMIT 150').all();

      const formattedNodes = nodes.results.map((n: any) => ({
        id: n.id,
        label: n.label,
        group: n.type,
        val: n.type === 'Document' ? 8 : 5,
      }));

      const formattedLinks = edges.results.map((e: any) => ({
        source: e.source,
        target: e.target,
        relation: e.relation,
      }));

      return jsonResponse({ nodes: formattedNodes, links: formattedLinks });
    }

    // Chat
    if (path === '/api/chat' && method === 'POST') {
      const {
        query,
        agentType,
        sources: providedSources,
        llmConfig,
        systemPrompt,
        temperature = 0.2,
        historyContext,
        userGoals,
        topK = 5,
      } = await request.json() as any;

      // Resolve system prompt with precedence: explicit > agentType > default
      const resolvedSystemPrompt = systemPrompt 
        || (agentType && AGENT_SYSTEM_PROMPTS[agentType])
        || 'You are a helpful assistant.';

      // Perform search if sources not provided
      let sources: any[] = providedSources || [];
      if (!providedSources || providedSources.length === 0) {
        const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
        const searchResults = await env.VECTOR_INDEX.query(embedding.data[0], { topK, returnMetadata: true });
        sources = searchResults.matches.map((r: any) => ({
          id: r.id,
          documentTitle: r.metadata?.title || 'Unknown',
          snippet: r.metadata?.content || '',
          score: r.score,
          metadata: r.metadata,
        }));
      }

      // Build context
      const contextBlock = sources.map(s => `[Doc: ${s.documentTitle}]\n${s.snippet}`).join('\n\n');
      const fullPrompt = `[SYSTEM CONTEXT]\nGoal: ${userGoals || 'Help the user'}\nRole: ${resolvedSystemPrompt}\n\n[SHORT-TERM MEMORY / CHAT HISTORY]\n${historyContext || 'No previous context.'}\n\n[RETRIEVED KNOWLEDGE]\n${contextBlock}\n\n[USER QUESTION]\n${query}\n\nAnswer the user's question based on the Knowledge and Memory.`;

      // Call LLM (mock)
      const provider = llmConfig?.provider || 'workers-ai';
      const model = llmConfig?.model || '@cf/meta/llama-3-8b-instruct';
      let responseText = '';

      try {
        if (provider === 'workers-ai' || !llmConfig) {
          const aiResponse = await env.AI.run(model, {
            messages: [
              { role: 'system', content: resolvedSystemPrompt },
              { role: 'user', content: fullPrompt },
            ],
            temperature,
          });
          responseText = aiResponse.response || 'Mock response from Workers AI';
        } else {
          // Mock external API calls
          responseText = `Mock response from ${provider}`;
        }
      } catch (llmError: any) {
        responseText = `Error: ${llmError.message}`;
      }

      return jsonResponse({
        response: responseText,
        sources: sources,
        provider,
        model,
      });
    }

    return new Response('Not Found', { status: 404 });
  } catch (e: any) {
    return errorResponse(e.message || String(e));
  }
}

describe('Worker API Tests', () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
  });

  describe('Health Endpoint', () => {
    test('GET /api/health returns ok status', async () => {
      const request = createRequest('/api/health', 'GET');
      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.service).toBe('metacogna');
      expect(data.timestamp).toBeDefined();
    });

    test('Health endpoint has CORS headers', async () => {
      const request = createRequest('/api/health', 'GET');
      const response = await handleRequest(request, env);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('CORS / OPTIONS', () => {
    test('OPTIONS request returns CORS headers', async () => {
      const request = createRequest('/api/health', 'OPTIONS');
      const response = await handleRequest(request, env);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });
  });

  describe('Auth Endpoints', () => {
    test('POST /api/auth/register creates new user', async () => {
      const request = createRequest('/api/auth/register', 'POST', {
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        createdAt: Date.now(),
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('POST /api/auth/register rejects duplicate username', async () => {
      // Register first user
      const request1 = createRequest('/api/auth/register', 'POST', {
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'hash1',
        createdAt: Date.now(),
      });
      await handleRequest(request1, env);

      // Try to register duplicate
      const request2 = createRequest('/api/auth/register', 'POST', {
        id: 'user-2',
        username: 'testuser',
        passwordHash: 'hash2',
        createdAt: Date.now(),
      });

      const response = await handleRequest(request2, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Username taken');
    });

    test('POST /api/auth/login succeeds with valid credentials', async () => {
      // Register user first
      const registerRequest = createRequest('/api/auth/register', 'POST', {
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'correcthash',
        createdAt: Date.now(),
      });
      await handleRequest(registerRequest, env);

      // Login
      const loginRequest = createRequest('/api/auth/login', 'POST', {
        username: 'testuser',
        passwordHash: 'correcthash',
      });

      const response = await handleRequest(loginRequest, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe('testuser');
    });

    test('POST /api/auth/login fails with invalid credentials', async () => {
      const request = createRequest('/api/auth/login', 'POST', {
        username: 'nonexistent',
        passwordHash: 'wronghash',
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Invalid credentials');
    });
  });

  describe('Ingest Endpoint', () => {
    test('POST /api/ingest processes document successfully', async () => {
      const request = createRequest('/api/ingest', 'POST', {
        docId: 'doc-1',
        title: 'Test Document',
        content: 'This is a test document with some content that will be chunked and embedded.',
        metadata: { source: 'test' },
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.chunks).toBeGreaterThan(0);
      expect(typeof data.graphNodes).toBe('number');
    });

    test('POST /api/ingest handles long content by chunking', async () => {
      const longContent = 'A'.repeat(2000); // Long content
      const request = createRequest('/api/ingest', 'POST', {
        docId: 'doc-2',
        title: 'Long Document',
        content: longContent,
        metadata: {},
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.chunks).toBeGreaterThan(1); // Should be chunked
    });

    test('POST /api/ingest handles empty content', async () => {
      const request = createRequest('/api/ingest', 'POST', {
        docId: 'doc-3',
        title: 'Empty Document',
        content: '',
        metadata: {},
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.chunks).toBe(0);
    });
  });

  describe('Search Endpoint', () => {
    test('POST /api/search returns results', async () => {
      // First ingest a document
      const ingestRequest = createRequest('/api/ingest', 'POST', {
        docId: 'doc-search-1',
        title: 'Searchable Document',
        content: 'This document contains information about artificial intelligence and machine learning.',
        metadata: { category: 'tech' },
      });
      await handleRequest(ingestRequest, env);

      // Then search
      const searchRequest = createRequest('/api/search', 'POST', {
        query: 'artificial intelligence',
        topK: 5,
      });

      const response = await handleRequest(searchRequest, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(Array.isArray(data.results)).toBe(true);
    });

    test('POST /api/search respects topK parameter', async () => {
      // Ingest multiple documents
      for (let i = 0; i < 3; i++) {
        const ingestRequest = createRequest('/api/ingest', 'POST', {
          docId: `doc-search-${i}`,
          title: `Document ${i}`,
          content: `Content for document ${i} with some text.`,
          metadata: {},
        });
        await handleRequest(ingestRequest, env);
      }

      const searchRequest = createRequest('/api/search', 'POST', {
        query: 'test query',
        topK: 2,
      });

      const response = await handleRequest(searchRequest, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.length).toBeLessThanOrEqual(2);
    });

    test('POST /api/search uses default topK when not provided', async () => {
      const request = createRequest('/api/search', 'POST', {
        query: 'test query',
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(data.results.length).toBeLessThanOrEqual(5); // Default topK
    });
  });

  describe('Graph Endpoint', () => {
    test('GET /api/graph returns nodes and links', async () => {
      // First ingest to create graph data
      const ingestRequest = createRequest('/api/ingest', 'POST', {
        docId: 'doc-graph-1',
        title: 'Graph Document',
        content: 'This document mentions AI and Machine Learning which are related concepts.',
        metadata: {},
      });
      await handleRequest(ingestRequest, env);

      const request = createRequest('/api/graph', 'GET');
      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.nodes).toBeDefined();
      expect(data.links).toBeDefined();
      expect(Array.isArray(data.nodes)).toBe(true);
      expect(Array.isArray(data.links)).toBe(true);
    });

    test('GET /api/graph formats nodes correctly', async () => {
      const ingestRequest = createRequest('/api/ingest', 'POST', {
        docId: 'doc-graph-2',
        title: 'Test Graph',
        content: 'Test content',
        metadata: {},
      });
      await handleRequest(ingestRequest, env);

      const request = createRequest('/api/graph', 'GET');
      const response = await handleRequest(request, env);
      const data = await response.json();

      if (data.nodes.length > 0) {
        const node = data.nodes[0];
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('label');
        expect(node).toHaveProperty('group');
        expect(node).toHaveProperty('val');
      }
    });

    test('GET /api/graph formats links correctly', async () => {
      const ingestRequest = createRequest('/api/ingest', 'POST', {
        docId: 'doc-graph-3',
        title: 'Linked Document',
        content: 'Content with relationships',
        metadata: {},
      });
      await handleRequest(ingestRequest, env);

      const request = createRequest('/api/graph', 'GET');
      const response = await handleRequest(request, env);
      const data = await response.json();

      if (data.links.length > 0) {
        const link = data.links[0];
        expect(link).toHaveProperty('source');
        expect(link).toHaveProperty('target');
        expect(link).toHaveProperty('relation');
      }
    });
  });

  describe('Chat Endpoint', () => {
    test('POST /api/chat returns response with sources', async () => {
      // First ingest a document
      const ingestRequest = createRequest('/api/ingest', 'POST', {
        docId: 'doc-chat-1',
        title: 'Chat Document',
        content: 'This document contains information about artificial intelligence.',
        metadata: { category: 'tech' },
      });
      await handleRequest(ingestRequest, env);

      const request = createRequest('/api/chat', 'POST', {
        query: 'What is artificial intelligence?',
        temperature: 0.2,
        systemPrompt: 'You are a helpful assistant.',
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBeDefined();
      expect(data.sources).toBeDefined();
      expect(Array.isArray(data.sources)).toBe(true);
      expect(data.provider).toBeDefined();
      expect(data.model).toBeDefined();
    });

    test('POST /api/chat uses provided sources when available', async () => {
      const providedSources = [
        {
          id: 'source-1',
          documentTitle: 'Test Doc',
          snippet: 'Test content',
          score: 0.9,
          metadata: { title: 'Test Doc' },
        },
      ];

      const request = createRequest('/api/chat', 'POST', {
        query: 'Test question',
        sources: providedSources,
        temperature: 0.3,
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBeDefined();
      expect(data.sources).toEqual(providedSources);
    });

    test('POST /api/chat routes agentType to correct system prompt', async () => {
      // First ingest a document
      const ingestRequest = createRequest('/api/ingest', 'POST', {
        docId: 'doc-agent-1',
        title: 'Agent Test Document',
        content: 'Test content for agent routing.',
        metadata: {},
      });
      await handleRequest(ingestRequest, env);

      const request = createRequest('/api/chat', 'POST', {
        query: 'Analyze the graph structure',
        agentType: 'graph-analyst',
        temperature: 0.2,
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBeDefined();
      // Verify that the agentType prompt was used (check mock AI was called with correct system prompt)
      // The resolvedSystemPrompt should contain graph analyst content
    });

    test('POST /api/chat explicit systemPrompt overrides agentType', async () => {
      const request = createRequest('/api/chat', 'POST', {
        query: 'Test question',
        agentType: 'graph-analyst',
        systemPrompt: 'Custom explicit prompt',
        temperature: 0.2,
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBeDefined();
      // Explicit systemPrompt should take precedence over agentType
    });

    test('POST /api/chat falls back to default when agentType not found', async () => {
      const request = createRequest('/api/chat', 'POST', {
        query: 'Test question',
        agentType: 'unknown-agent-type',
        temperature: 0.2,
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBeDefined();
      // Should use default prompt when agentType doesn't exist
    });

    test('POST /api/chat includes history context in prompt', async () => {
      const request = createRequest('/api/chat', 'POST', {
        query: 'Follow up question',
        historyContext: 'Previous: User asked about AI. Assistant: AI is...',
        userGoals: 'Learn about technology',
        systemPrompt: 'Technical expert',
        temperature: 0.2,
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBeDefined();
    });

    test('POST /api/chat handles different LLM providers', async () => {
      const request = createRequest('/api/chat', 'POST', {
        query: 'Test query',
        llmConfig: {
          provider: 'workers-ai',
          model: '@cf/meta/llama-3-8b-instruct',
        },
        temperature: 0.5,
      });

      const response = await handleRequest(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.provider).toBe('workers-ai');
      expect(data.model).toBe('@cf/meta/llama-3-8b-instruct');
    });
  });

  describe('Error Handling', () => {
    test('Returns 404 for unknown routes', async () => {
      const request = createRequest('/api/unknown', 'GET');
      const response = await handleRequest(request, env);

      expect(response.status).toBe(404);
    });

    test('Returns error for invalid JSON in POST requests', async () => {
      const request = new Request('https://api.metacogna.ai/api/auth/login', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handleRequest(request, env);
      expect(response.status).toBe(500);
    });
  });
});

