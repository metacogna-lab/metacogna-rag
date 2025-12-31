
/**
 * Cloudflare Worker Backend for Pratejra RAG
 * Handles: Auth (D1), Vector Search (Vectorize), Ingestion (Workers AI), Knowledge Graph (AI + D1)
 */

import { handleSignup } from './handlers/signup';

interface Env {
  AI: any;
  VECTORIZE: any; // VectorizeIndex
  DB: any; // D1Database
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
        const { docId, title, content, metadata } = await request.json() as any;
        
        // 1. Storage: Persist Document Metadata
        await env.DB.prepare(
          'INSERT OR REPLACE INTO documents (id, title, content, metadata, createdAt) VALUES (?, ?, ?, ?, ?)'
        ).bind(docId, title, content.substring(0, 1000), JSON.stringify(metadata), Date.now()).run();

        // 2. Vector Processing: Chunk & Embed
        const chunks = content.match(/.{1,512}/g) || [];
        const embeddingsResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: chunks });
        
        const vectors = chunks.map((chunk: string, i: number) => ({
          id: `${docId}-${i}`,
          values: embeddingsResponse.data[i],
          metadata: { ...metadata, docId, title, content: chunk, chunkIndex: i }
        }));
        
        await env.VECTORIZE.upsert(vectors);

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
            const nodeStmt = env.DB.prepare('INSERT OR IGNORE INTO graph_nodes (id, label, type, summary) VALUES (?, ?, ?, ?)');
            const edgeStmt = env.DB.prepare('INSERT OR IGNORE INTO graph_edges (id, source, target, relation) VALUES (?, ?, ?, ?)');
            
            const batch = [];
            
            // Nodes
            for (const n of graphData.nodes) {
                batch.push(nodeStmt.bind(n.id, n.id, n.type || 'Concept', n.summary || ''));
            }
            
            // Edges
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
            graphNodes: graphData.nodes?.length || 0 
        });
      }

      // --- SEARCH ROUTE ---
      if (path === '/api/search' && method === 'POST') {
        const { query, topK = 5 } = await request.json() as any;
        const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
        const results = await env.VECTORIZE.query(embedding.data[0], { topK, returnMetadata: true });
        return jsonResponse({ results: results.matches });
      }

      // --- GRAPH DATA ROUTE ---
      if (path === '/api/graph' && method === 'GET') {
        // Fetch all nodes and edges from D1
        // Limit to 100 for performance visualization
        const nodes = await env.DB.prepare('SELECT * FROM graph_nodes LIMIT 100').all();
        const edges = await env.DB.prepare('SELECT * FROM graph_edges LIMIT 150').all();
        
        // Map to frontend format
        const formattedNodes = nodes.results.map((n: any) => ({
            id: n.id,
            label: n.label,
            group: n.type,
            val: n.type === 'Document' ? 8 : 5
        }));

        const formattedLinks = edges.results.map((e: any) => ({
            source: e.source,
            target: e.target,
            relation: e.relation
        }));

        return jsonResponse({ nodes: formattedNodes, links: formattedLinks });
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
          topK = 5 
        } = await request.json() as any;

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
          'GET /api/graph'
        ]
      }, 404);
      
    } catch (e: any) {
      return errorResponse(e.message || String(e));
    }
  }
}
