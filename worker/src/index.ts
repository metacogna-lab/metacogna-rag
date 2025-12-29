
/**
 * Cloudflare Worker Backend for Pratejra RAG
 * Handles: Auth (D1), Vector Search (Vectorize), Ingestion (Workers AI), Knowledge Graph (AI + D1)
 */

interface Env {
  AI: any;
  VECTOR_INDEX: any; // VectorizeIndex
  DB: any; // D1Database
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_HOST?: string;
}

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
        
        await env.VECTOR_INDEX.upsert(vectors);

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
        const results = await env.VECTOR_INDEX.query(embedding.data[0], { topK, returnMetadata: true });
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

      return new Response('Not Found', { status: 404 });
      
    } catch (e: any) {
      return errorResponse(e.message || String(e));
    }
  }
}
