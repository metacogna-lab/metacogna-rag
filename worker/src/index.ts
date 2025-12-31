
/**
 * Cloudflare Worker Backend for Pratejra RAG
 * Handles: Auth (D1), Vector Search (Vectorize), Ingestion (Workers AI), Knowledge Graph (AI + D1)
 */

import { handleSignup } from './handlers/signup';
import { uploadToR2 } from './services/r2';
import { generateR2DocumentKey } from './utils/r2-keys';

interface Env {
  AI: any;
  VECTORIZE: any; // VectorizeIndex
  DB: any; // D1Database
  KV: any; // KV namespace for caching and rate limiting
  metacogna_vault: any; // R2 bucket for document storage
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_HOST?: string;
  API_BASE_URL?: string;
  // LLM API Keys (stored as secrets)
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}

// Agent system prompts mapping (using enhanced prompts)
const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  'rag-chat': 'You are a helpful assistant that answers questions based on retrieved knowledge. Prioritize accuracy and cite sources when relevant.',
  'graph-analyst': `You are a knowledge graph analyst specializing in structural analysis of information networks.
Your role is to:
- Identify central nodes and their influence in the graph
- Detect clusters and communities of related concepts
- Analyze relationship patterns and connection strengths
- Provide concise, actionable insights about graph topology
- Highlight important connections that might not be immediately obvious
Focus on structural insights, centrality metrics, and cluster identification.`,
  'executive-summary': `You are an executive communication specialist. Generate professional, high-level summaries.
Your approach:
- Assume the user is an expert in their field
- Use formal, business-appropriate language
- Focus on key insights and strategic implications
- Structure summaries with clear sections (Overview, Key Findings, Recommendations)
- Maintain brevity while ensuring completeness
- Highlight actionable takeaways and next steps`,
  'technical-auditor': `You are a technical systems auditor. Provide raw, detailed technical analysis.
Your focus areas:
- Data density and distribution patterns
- Metadata structure and completeness
- Type classifications and taxonomies
- Performance implications and bottlenecks
- Data quality metrics and anomalies
- Technical debt indicators
Be precise, use technical terminology, and provide quantifiable observations.`,
  'future-planner': `You are a strategic future planner. Analyze content to predict and plan ahead.
Your process:
- Identify patterns and trends in the current knowledge base
- Predict future projects, learning paths, or knowledge gaps
- Suggest concrete next steps with priorities
- Map dependencies between concepts and goals
- Highlight opportunities for growth and development
- Provide actionable roadmaps with milestones
Be forward-looking, practical, and specific in your recommendations.`,
  'coordinator': `You are the Coordinator agent in a cognitive graph simulation system.
Your primary functions:
- Synthesize disparate ideas into unified concepts
- Build connections between knowledge blocks
- Check Short-Term memory to avoid repeating recent actions
- Use Long-Term memory (RAG) to ground ideas in existing knowledge
- Create coherent narratives from fragmented information
- Prioritize building over breaking
When merging ideas, look for common themes, complementary aspects, and synthesis opportunities.`,
  'critic': `You are the Critic agent in a cognitive graph simulation system.
Your primary functions:
- Question assumptions and identify logical gaps
- Refine ideas by challenging their coherence
- Look for inconsistencies in Medium-Term history
- Break down overly complex concepts into manageable parts
- If you see a reference to another stream, use READ_STREAM to fetch context
- Prioritize precision and clarity over expansion
When critiquing, be constructive but thorough. Identify weaknesses, edge cases, and potential improvements.`,
  'supervisor': `You are the SUPERVISOR SUPER AGENT, a metacognitive orchestration layer that monitors and regulates the entire system.
Your core responsibility: Evaluate, inhibit, and refine system decisions - you do NOT execute tasks directly.
Execute a cognitive loop: (1) Inhibitory Control - check alignment with user values/goals, (2) Counterfactual Simulation - assess worst-case downstream effects, (3) Epistemic Humility - calculate confidence scores, (4) Recursive Self-Correction - update policies based on patterns.`,
  'product-manager': `You are a Product Manager analyzing prompt ideas.
Your task:
- Analyze the provided prompt ideas for their potential as product features
- Propose 3 concrete Product Features or Applications
- Consider: user value, feasibility, market fit, technical requirements
- Structure each proposal with: Feature Name, User Benefit, Implementation Approach
- Prioritize features that solve real problems and have clear value propositions`,
  'strategic-planner': `You are a Strategic Planner analyzing prompts for capability development.
Your task:
- Analyze the prompts to understand desired capabilities
- Suggest a Roadmap Progression to achieve these capabilities
- Break down into phases: Immediate (0-3 months), Short-term (3-6 months), Long-term (6-12 months)
- Identify dependencies, prerequisites, and milestones
- Consider resource requirements and risk factors
- Provide actionable steps with clear success criteria`,
  'lead-critic': `You are a Lead Critic performing rigorous analysis.
Your task:
- Analyze prompts for flaws, edge cases, and safety risks
- Be harsh but constructive in your critique
- Identify: logical inconsistencies, implementation challenges, potential failures
- Consider: scalability, security, user experience, maintainability
- Provide specific, actionable feedback with examples
- Suggest improvements and alternatives where appropriate`,
  'synthesis-engine': 'Focus on finding commonalities, patterns, and unifying principles. Look for ways to combine ideas that create new insights beyond the sum of parts. Identify complementary aspects and build coherent frameworks.',
  'creative-forge': 'Be speculative and imaginative. Use existing blocks as springboards for novel concepts. Explore "what if" scenarios, alternative perspectives, and unconventional connections. Generate ideas that extend beyond current boundaries.',
  'socratic-critic': 'Be critical and thorough. Question assumptions, identify logical gaps, expose contradictions, and challenge weak reasoning. Use Socratic questioning to reveal hidden flaws. Break down complex ideas to test their foundations.'
};

// Helper to construct JSON response
const jsonResponse = (data: any, status = 200) => 
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });

const errorResponse = (msg: string, status = 500) => jsonResponse({ error: msg }, status);

// Rate limiting helper (uses KV namespace)
async function checkRateLimit(
  kv: any,
  userId: string,
  endpoint: string,
  maxRequests: number = 10,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  console.log('[RateLimit] Called with:', { kvBound: !!kv, userId, endpoint, maxRequests });

  if (!kv) {
    console.log('[RateLimit] KV not bound - graceful degradation');
    return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowSeconds * 1000 };
  }

  const key = `ratelimit:${userId}:${endpoint}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  console.log('[RateLimit] Fetching key:', key);
  const data = await kv.get(key, 'json');
  console.log('[RateLimit] Current data:', data);

  if (!data) {
    console.log('[RateLimit] First request - initializing counter');
    await kv.put(key, JSON.stringify({ count: 1, resetAt: now + windowMs }), { expirationTtl: windowSeconds });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (data.count >= maxRequests) {
    console.log('[RateLimit] LIMIT EXCEEDED:', data.count, '>=', maxRequests);
    return { allowed: false, remaining: 0, resetAt: data.resetAt };
  }

  console.log('[RateLimit] Incrementing:', data.count, '->', data.count + 1);
  await kv.put(key, JSON.stringify({ count: data.count + 1, resetAt: data.resetAt }), { expirationTtl: windowSeconds });
  return { allowed: true, remaining: maxRequests - data.count - 1, resetAt: data.resetAt };
}

// Semantic chunking with sentence boundaries and sliding window
function semanticChunk(text: string, maxSize: number = 512, overlap: number = 50): string[] {
  // Split on sentence boundaries (., !, ?, or newlines)
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // If adding this sentence would exceed max size
    if (currentChunk.length + trimmedSentence.length > maxSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // Start new chunk with overlap from end of previous chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.min(overlap / 5, words.length)); // ~10 words overlap
        currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
      } else {
        // Single sentence exceeds max size, split it
        chunks.push(trimmedSentence.substring(0, maxSize));
        currentChunk = trimmedSentence.substring(maxSize);
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // Debug logging (remove in production if needed)
    console.log(`[${method}] ${path} - Host: ${url.hostname}`);

    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    try {
      // --- ROOT PATH HANDLER ---
      if (path === '/' && method === 'GET') {
        return jsonResponse({
          service: 'metacogna-api',
          version: '1.0.0',
          status: 'ok',
          endpoints: {
            health: '/api/health',
            auth: '/api/auth/login, /api/auth/register',
            signup: '/api/signup (admin-only)',
            ingest: '/api/ingest',
            search: '/api/search',
            graph: '/api/graph',
            chat: '/api/chat'
          },
          documentation: 'https://docs.metacogna.ai'
        });
      }

      // --- HEALTH CHECK ---
      if (path === '/api/health' && method === 'GET') {
        return jsonResponse({
          status: 'ok',
          timestamp: Date.now(),
          service: 'metacogna'
        });
      }

      // --- DEBUG: Check bindings ---
      if (path === '/api/debug/bindings' && method === 'GET') {
        return jsonResponse({
          KV: env.KV ? 'bound' : 'NOT BOUND',
          DB: env.DB ? 'bound' : 'NOT BOUND',
          VECTORIZE: env.VECTORIZE ? 'bound' : 'NOT BOUND',
          AI: env.AI ? 'bound' : 'NOT BOUND',
          R2: env.metacogna_vault ? 'bound' : 'NOT BOUND'
        });
      }

      // --- AUTH ROUTE ---
      if (path === '/api/auth/login' && method === 'POST') {
        const { username, passwordHash } = await request.json() as any;
        const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND passwordHash = ?')
          .bind(username, passwordHash)
          .first();
        
        if (!user) return jsonResponse({ success: false, message: 'Invalid credentials' }, 401);
        return jsonResponse({ success: true, user });
      }

      if (path === '/api/auth/register' && method === 'POST') {
        const { id, username, passwordHash, createdAt } = await request.json() as any;
        try {
          await env.DB.prepare('INSERT INTO users (id, username, passwordHash, createdAt) VALUES (?, ?, ?, ?)')
            .bind(id, username, passwordHash, createdAt)
            .run();
          return jsonResponse({ success: true });
        } catch (e) {
          return jsonResponse({ success: false, message: 'Username taken' }, 400);
        }
      }

      // --- ADMIN-ONLY SIGNUP ROUTE ---
      if (path === '/api/signup' && method === 'POST') {
        return await handleSignup(request, env);
      }

      // --- INGEST ROUTE (Vectors + Graph) ---
      if (path === '/api/ingest' && method === 'POST') {
        const { docId, userId, title, content, metadata } = await request.json() as any;

        // Validate required fields
        if (!userId) {
          return jsonResponse({ success: false, error: 'Missing required field: userId' }, 400);
        }

        // Initialize progress tracking
        const startTime = Date.now();
        await env.DB.prepare(
          'INSERT OR REPLACE INTO document_ingestion_status (documentId, userId, status, progress, currentStep, chunksTotal, chunksProcessed, startedAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(docId, userId, 'processing', 0, 'Uploading to R2', 0, 0, startTime, startTime).run();

        // 1. Storage: Upload FULL content to R2
        const r2Key = generateR2DocumentKey(userId, docId, title);
        await uploadToR2(env.metacogna_vault, r2Key, content, {
          userId,
          docId,
          title,
          uploadedAt: Date.now().toString(),
          ...metadata
        });

        // Update progress: R2 upload complete
        await env.DB.prepare(
          'UPDATE document_ingestion_status SET progress = ?, currentStep = ?, updatedAt = ? WHERE documentId = ?'
        ).bind(20, 'Saving metadata', Date.now(), docId).run();

        // 2. Storage: Persist Document Metadata with preview (first 500 chars) in D1
        await env.DB.prepare(
          'INSERT OR REPLACE INTO documents (id, userId, title, content, r2Key, metadata, createdAt, uploadedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          docId,
          userId,
          title,
          content.substring(0, 500),  // Preview only
          r2Key,
          JSON.stringify(metadata),
          Date.now(),
          Date.now()
        ).run();

        // Update progress: Starting chunking
        const chunks = semanticChunk(content, 512, 50);
        await env.DB.prepare(
          'UPDATE document_ingestion_status SET progress = ?, currentStep = ?, chunksTotal = ?, updatedAt = ? WHERE documentId = ?'
        ).bind(30, 'Embedding chunks', chunks.length, Date.now(), docId).run();

        // 2. Vector Processing: Semantic Chunking & Embed
        const embeddingsResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: chunks });
        
        const vectors = chunks.map((chunk: string, i: number) => ({
          id: `${docId}-${i}`,
          values: embeddingsResponse.data[i],
          metadata: { ...metadata, docId, title, content: chunk, chunkIndex: i }
        }));

        await env.VECTORIZE.upsert(vectors);

        // Update progress: Vectors inserted
        await env.DB.prepare(
          'UPDATE document_ingestion_status SET progress = ?, currentStep = ?, chunksProcessed = ?, updatedAt = ? WHERE documentId = ?'
        ).bind(60, 'Extracting knowledge graph', chunks.length, Date.now(), docId).run();

        // 3. Graph Processing: Extract Entities & Relations
        // We use a lighter model for speed, or a stronger one for quality.
        const graphPrompt = `
          Extract the knowledge graph from the text below.
          Identify key "nodes" (Concepts, Technologies, People, Organizations) and "edges" (relationships between them).
          Output strictly valid JSON with this structure:
          { "nodes": [{"id": "Name", "type": "Type", "summary": "Short desc"}], "edges": [{"source": "Name", "target": "Name", "relation": "verb"}] }
          
          Text: "${content.substring(0, 2000).replace(/"/g, "'")}"
        `;

        let graphData = { nodes: [], edges: [] };
        try {
            const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
                messages: [{ role: 'user', content: graphPrompt }],
                response_format: { type: 'json_object' } // Enforce JSON if supported, else rely on parsing
            });
            
            // Attempt to parse response (handling potential markdown wrapping)
            let rawJson = aiResponse.response || "";
            if (rawJson.includes('```json')) {
                rawJson = rawJson.split('```json')[1].split('```')[0];
            }
            graphData = JSON.parse(rawJson);
        } catch (err) {
            console.error("Graph extraction failed or parsing error:", err);
            // Non-blocking failure for graph
        }

        // 4. Storage: Persist Graph
        if (graphData.nodes && graphData.nodes.length > 0) {
            const nodeStmt = env.DB.prepare('INSERT OR IGNORE INTO graph_nodes (id, label, type, summary, documentId) VALUES (?, ?, ?, ?, ?)');
            const edgeStmt = env.DB.prepare('INSERT OR IGNORE INTO graph_edges (id, source, target, relation, documentId) VALUES (?, ?, ?, ?, ?)');

            const batch = [];

            // Nodes
            for (const n of graphData.nodes) {
                batch.push(nodeStmt.bind(n.id, n.id, n.type || 'Concept', n.summary || '', docId));
            }

            // Edges
            if (graphData.edges) {
                for (const e of graphData.edges) {
                    const edgeId = `${e.source}-${e.relation}-${e.target}`.replace(/\s+/g, '_');
                    batch.push(edgeStmt.bind(edgeId, e.source, e.target, e.relation, docId));
                }
            }

            // Link Document to extracted Nodes (First 3)
            for (let i = 0; i < Math.min(graphData.nodes.length, 3); i++) {
                const n = graphData.nodes[i];
                const linkId = `docLink-${docId}-${n.id}`;
                batch.push(edgeStmt.bind(linkId, `DOC:${docId}`, n.id, 'mentions', docId));
            }

            // Also ensure the Document Node exists
            batch.push(nodeStmt.bind(`DOC:${docId}`, title, 'Document', 'Source File', docId));

            await env.DB.batch(batch);

            // Invalidate graph cache since we just added new nodes/edges
            if (env.KV) {
              await env.KV.delete('graph:latest');
            }
        }

        // Mark ingestion as completed
        await env.DB.prepare(
          'UPDATE document_ingestion_status SET status = ?, progress = ?, currentStep = ?, completedAt = ?, updatedAt = ? WHERE documentId = ?'
        ).bind('completed', 100, 'Completed', Date.now(), Date.now(), docId).run();

        return jsonResponse({
            success: true,
            r2Key,
            chunks: chunks.length,
            graphNodes: graphData.nodes?.length || 0
        });
      }

      // --- SEARCH ROUTE ---
      if (path === '/api/search' && method === 'POST') {
        const { query, topK = 5, userId } = await request.json() as any;

        // Rate limiting: 20 searches per minute per user
        const rateLimit = await checkRateLimit(env.KV, userId || 'anonymous', 'search', 20, 60);
        if (!rateLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many search requests. Please try again later.',
            resetAt: rateLimit.resetAt
          }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Remaining': String(rateLimit.remaining),
              'X-RateLimit-Reset': String(rateLimit.resetAt)
            }
          });
        }

        const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
        const results = await env.VECTORIZE.query(embedding.data[0], { topK, returnMetadata: true });

        return new Response(JSON.stringify({ results: results.matches }), {
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetAt)
          }
        });
      }

      // --- GRAPH DATA ROUTE ---
      if (path === '/api/graph' && method === 'GET') {
        // Check cache first (5-minute TTL)
        const cacheKey = 'graph:latest';
        if (env.KV) {
          const cached = await env.KV.get(cacheKey, 'json');
          if (cached) {
            return jsonResponse({
              ...cached,
              metadata: { ...cached.metadata, cached: true, cacheHit: true }
            });
          }
        }

        // Fetch nodes and edges in parallel using D1 batch API (2x faster)
        const [nodesResult, edgesResult] = await env.DB.batch([
          env.DB.prepare('SELECT * FROM graph_nodes ORDER BY id LIMIT 100'),
          env.DB.prepare('SELECT * FROM graph_edges ORDER BY source LIMIT 150')
        ]);

        // Map to frontend format
        const formattedNodes = nodesResult.results.map((n: any) => ({
            id: n.id,
            label: n.label,
            group: n.type,
            val: n.type === 'Document' ? 8 : 5
        }));

        const formattedLinks = edgesResult.results.map((e: any) => ({
            source: e.source,
            target: e.target,
            relation: e.relation
        }));

        const graphData = {
          nodes: formattedNodes,
          links: formattedLinks,
          metadata: {
            nodeCount: formattedNodes.length,
            edgeCount: formattedLinks.length,
            cached: false,
            generatedAt: Date.now()
          }
        };

        // Cache for 5 minutes
        if (env.KV) {
          await env.KV.put(cacheKey, JSON.stringify(graphData), { expirationTtl: 300 });
        }

        return jsonResponse(graphData);
      }

      // --- CHAT ROUTE (RAG + LLM) ---
      if (path === '/api/chat' && method === 'POST') {
        const {
          query,
          agentType,  // NEW: Routing field for automatic prompt selection
          sources: providedSources,
          llmConfig,
          systemPrompt,  // Can override agentType prompt
          temperature = 0.2,
          historyContext,
          userGoals,
          userId,
          topK = 5
        } = await request.json() as any;

        // Rate limiting: 10 chat requests per minute per user
        const rateLimit = await checkRateLimit(env.KV, userId || 'anonymous', 'chat', 10, 60);
        if (!rateLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many chat requests. Please try again later.',
            resetAt: rateLimit.resetAt
          }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Remaining': String(rateLimit.remaining),
              'X-RateLimit-Reset': String(rateLimit.resetAt)
            }
          });
        }

        // Resolve system prompt with precedence: explicit systemPrompt > agentType > default
        const resolvedSystemPrompt = systemPrompt
          || (agentType && AGENT_SYSTEM_PROMPTS[agentType])
          || 'You are a helpful assistant.';

        // 1. Perform vector search if sources not provided
        let sources: any[] = providedSources || [];
        if (!providedSources || providedSources.length === 0) {
          const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
          const searchResults = await env.VECTORIZE.query(embedding.data[0], { topK, returnMetadata: true });
          sources = searchResults.matches.map((r: any) => ({
            id: r.id,
            documentTitle: r.metadata?.title || 'Unknown',
            snippet: r.metadata?.content || '',
            score: r.score,
            metadata: r.metadata
          }));
        }

        // 2. Build context from sources
        const contextBlock = sources.map(s => `[Doc: ${s.documentTitle}]\n${s.snippet}`).join('\n\n');
        
        // 3. Construct prompt (matching RAGEngine format)
        const fullPrompt = `
    [SYSTEM CONTEXT]
    Goal: ${userGoals || 'Help the user'}
    Role: ${resolvedSystemPrompt}
    
    [SHORT-TERM MEMORY / CHAT HISTORY]
    ${historyContext || "No previous context."}

    [RETRIEVED KNOWLEDGE]
    ${contextBlock}

    [USER QUESTION]
    ${query}
    
    Answer the user's question based on the Knowledge and Memory. If the answer is in Memory, prioritize it.
    `;

        // 4. Call LLM
        let responseText = '';
        const provider = llmConfig?.provider || 'workers-ai';
        const model = llmConfig?.model || '@cf/meta/llama-3-8b-instruct';

        try {
          if (provider === 'workers-ai' || !llmConfig) {
            // Use Cloudflare Workers AI (free)
            const aiResponse = await env.AI.run(model, {
              messages: [
                { role: 'system', content: resolvedSystemPrompt },
                { role: 'user', content: fullPrompt }
              ],
              temperature
            });
            responseText = aiResponse.response || '';
          } else {
            // Use external LLM APIs
            const apiKey = provider === 'google' ? env.GEMINI_API_KEY 
                         : provider === 'openai' ? env.OPENAI_API_KEY
                         : provider === 'anthropic' ? env.ANTHROPIC_API_KEY
                         : null;

            if (!apiKey) {
              throw new Error(`${provider} API key not configured`);
            }

            if (provider === 'openai') {
              const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                  model: model,
                  messages: [
                    { role: 'system', content: resolvedSystemPrompt },
                    { role: 'user', content: fullPrompt }
                  ],
                  temperature,
                  max_tokens: llmConfig.maxTokens || 2048
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error?.message || 'OpenAI Error');
              responseText = data.choices?.[0]?.message?.content || '';
            } else if (provider === 'anthropic') {
              const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                  model: model,
                  system: resolvedSystemPrompt,
                  messages: [{ role: 'user', content: fullPrompt }],
                  max_tokens: llmConfig.maxTokens || 2048,
                  temperature
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error?.message || 'Anthropic Error');
              responseText = data.content?.[0]?.text || '';
            } else if (provider === 'google') {
              // Google Gemini via API
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: fullPrompt }] }],
                  generationConfig: {
                    temperature,
                    maxOutputTokens: llmConfig.maxTokens || 2048
                  }
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error?.message || 'Google AI Error');
              responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }
          }
        } catch (llmError: any) {
          console.error('LLM generation failed:', llmError);
          responseText = `I encountered an error generating the response: ${llmError.message}`;
        }

        return jsonResponse({
          response: responseText,
          sources: sources,
          provider,
          model
        });
      }

      // --- SUPERVISOR: STATE CHANGE DETECTION ---
      if (path === '/api/supervisor/state-change' && method === 'POST') {
        const { userId, timestamp, documentCount, goalsHash } = await request.json() as any;

        const lastSnapshot = await env.DB.prepare(
          'SELECT * FROM user_state_snapshots WHERE userId = ? ORDER BY timestamp DESC LIMIT 1'
        ).bind(userId).first();

        let changePercentage = 0;
        if (lastSnapshot) {
          const docChange = Math.abs(documentCount - (lastSnapshot.documentCount || 0)) / Math.max(lastSnapshot.documentCount || 1, 1);
          const goalsChanged = goalsHash !== lastSnapshot.goalsHash ? 0.3 : 0;
          changePercentage = docChange + goalsChanged;
        }

        await env.DB.prepare(
          'INSERT INTO user_state_snapshots (id, userId, timestamp, documentCount, goalsHash, changePercentage) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(`snap-${userId}-${timestamp}`, userId, timestamp, documentCount, goalsHash, changePercentage).run();

        return jsonResponse({ changePercentage, shouldTriggerSupervisor: changePercentage > 0.05 });
      }

      // --- SUPERVISOR: ANALYSIS ---
      if (path === '/api/supervisor/analyze' && method === 'POST') {
        const { userId, userGoals } = await request.json() as any;

        const interactions = await env.DB.prepare(
          'SELECT * FROM user_interaction_log WHERE userId = ? ORDER BY timestamp DESC LIMIT 20'
        ).bind(userId).all();

        const policies = await env.DB.prepare(
          'SELECT * FROM supervisor_policies WHERE userId = ? ORDER BY lastApplied DESC LIMIT 10'
        ).bind(userId).all();

        const prompt = `SUPERVISOR ANALYSIS\nGoals: ${userGoals}\n\nRecent Actions: ${interactions.results.map((i: any) => i.actionType).join(', ')}\n\nOutput JSON with: type (inhibit/allow/request_guidance), confidenceScore (0-100), userMessage, reasoning`;

        const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });

        const decision = JSON.parse(aiResponse.response || '{}');

        await env.DB.prepare(
          'INSERT INTO supervisor_decisions (id, userId, timestamp, decisionType, confidenceScore, userMessage, reasoning, displayMode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          `dec-${userId}-${Date.now()}`,
          userId,
          Date.now(),
          decision.type || 'allow',
          decision.confidenceScore || 50,
          decision.userMessage || '',
          decision.reasoning || '',
          (decision.confidenceScore || 50) < 70 ? 'toast' : 'widget'
        ).run();

        return jsonResponse({ success: true, decision });
      }

      // --- SUPERVISOR: LOG INTERACTION ---
      if (path === '/api/interactions/log' && method === 'POST') {
        const { userId, timestamp, viewState, actionType, actionTarget, actionPayload } = await request.json() as any;

        await env.DB.prepare(
          'INSERT INTO user_interaction_log (id, userId, timestamp, viewState, actionType, actionTarget, actionPayload) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(`int-${userId}-${timestamp}`, userId, timestamp, viewState, actionType, actionTarget || null, actionPayload || null).run();

        return jsonResponse({ success: true });
      }

      // --- SUPERVISOR: GET DECISIONS ---
      if (path === '/api/supervisor/decisions' && method === 'GET') {
        const userId = url.searchParams.get('userId');

        const decisions = await env.DB.prepare(
          'SELECT * FROM supervisor_decisions WHERE userId = ? ORDER BY timestamp DESC LIMIT 50'
        ).bind(userId).all();

        return jsonResponse({ decisions: decisions.results });
      }

      // --- SUPERVISOR: GET RECENT INTERACTIONS ---
      if (path === '/api/interactions/recent' && method === 'GET') {
        const userId = url.searchParams.get('userId');
        const limit = parseInt(url.searchParams.get('limit') || '50');

        const interactions = await env.DB.prepare(
          'SELECT * FROM user_interaction_log WHERE userId = ? ORDER BY timestamp DESC LIMIT ?'
        ).bind(userId, limit).all();

        return jsonResponse({ interactions: interactions.results });
      }

      // --- SUPERVISOR: DISMISS TOAST ---
      if (path === '/api/supervisor/decisions/dismiss' && method === 'POST') {
        const { decisionId, dismissedAt } = await request.json() as any;

        await env.DB.prepare(
          'UPDATE supervisor_decisions SET dismissedAt = ? WHERE id = ?'
        ).bind(dismissedAt, decisionId).run();

        return jsonResponse({ success: true });
      }

      // --- DOCUMENTS: LIST USER DOCUMENTS ---
      if (path === '/api/documents' && method === 'GET') {
        const userId = url.searchParams.get('userId');

        if (!userId) {
          return errorResponse('Missing required parameter: userId', 400);
        }

        const documents = await env.DB.prepare(
          'SELECT id, userId, title, content, r2Key, metadata, createdAt, uploadedAt, status FROM documents WHERE userId = ? ORDER BY uploadedAt DESC'
        ).bind(userId).all();

        return jsonResponse({
          documents: documents.results,
          count: documents.results.length
        });
      }

      // --- DOCUMENTS: DELETE SINGLE DOCUMENT ---
      if (path.startsWith('/api/documents/') && method === 'DELETE') {
        const docId = path.split('/')[3];

        if (!docId) {
          return errorResponse('Missing document ID', 400);
        }

        // Get document details first to get R2 key
        const doc = await env.DB.prepare(
          'SELECT r2Key, userId FROM documents WHERE id = ?'
        ).bind(docId).first() as any;

        if (!doc) {
          return errorResponse('Document not found', 404);
        }

        // Delete from R2
        if (doc.r2Key) {
          try {
            await env.metacogna_vault.delete(doc.r2Key);
          } catch (e: any) {
            console.warn(`Failed to delete R2 object ${doc.r2Key}:`, e.message);
          }
        }

        // Delete from Vectorize (all chunks)
        try {
          // Note: Vectorize doesn't have bulk delete by prefix, so we need to track chunk IDs
          // For now, we'll delete up to 100 chunks (typical doc has < 50)
          const chunkIds = Array.from({ length: 100 }, (_, i) => `${docId}-${i}`);
          await env.VECTORIZE.deleteByIds(chunkIds);
        } catch (e: any) {
          console.warn(`Failed to delete vectors for ${docId}:`, e.message);
        }

        // Delete from graph_nodes and graph_edges
        await env.DB.prepare(
          'DELETE FROM graph_nodes WHERE documentId = ?'
        ).bind(docId).run();

        await env.DB.prepare(
          'DELETE FROM graph_edges WHERE documentId = ?'
        ).bind(docId).run();

        // Delete document record from D1
        await env.DB.prepare(
          'DELETE FROM documents WHERE id = ?'
        ).bind(docId).run();

        // Invalidate graph cache since we deleted graph nodes/edges
        if (env.KV) {
          await env.KV.delete('graph:latest');
        }

        return jsonResponse({
          success: true,
          message: 'Document deleted successfully',
          documentId: docId
        });
      }

      // --- DOCUMENTS: GET UPLOAD STATUS ---
      if (path.match(/^\/api\/documents\/[^\/]+\/status$/) && method === 'GET') {
        const docId = path.split('/')[3];

        const status = await env.DB.prepare(
          'SELECT * FROM document_ingestion_status WHERE documentId = ?'
        ).bind(docId).first();

        if (!status) {
          return jsonResponse({
            status: 'not_found',
            message: 'No status tracking for this document'
          }, 404);
        }

        return jsonResponse({ status });
      }

      return jsonResponse({
        error: 'Not Found',
        message: `The requested path '${path}' was not found.`,
        availableEndpoints: [
          'GET /api/health',
          'POST /api/auth/login',
          'POST /api/auth/register',
          'POST /api/signup (admin-only)',
          'POST /api/ingest',
          'POST /api/search',
          'POST /api/chat',
          'GET /api/graph',
          'POST /api/supervisor/state-change',
          'POST /api/supervisor/analyze',
          'POST /api/interactions/log',
          'GET /api/supervisor/decisions',
          'GET /api/interactions/recent'
        ]
      }, 404);
      
    } catch (e: any) {
      return errorResponse(e.message || String(e));
    }
  }
}
