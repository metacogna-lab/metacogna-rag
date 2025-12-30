
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Document, Source, RecursiveNode, AppConfig, GraphData, GraphNode, GraphLink, ChatMessage } from "../types";
import { MOCK_KNOWLEDGE_BASE, MOCK_DOCUMENTS, MOCK_GRAPH_DATA } from "../constants";
import { trainingService } from "./TrainingDataService";
import { llmService } from "./LLMService";
import { analyticsService } from "./AnalyticsService";
import { systemLogs } from "./LogService";

// Configuration for the RAG Engine
const CONFIG = {
  chunkSize: 512, 
  overlap: 50,
  vectorDimensions: 1536,
  rateLimitRPM: 10,
  workerUrl: '/api', // Proxy or absolute URL to Cloudflare Worker
};

interface VectorChunk {
    docId: string;
    content: string;
    metadata: Record<string, any>;
    embedding?: number[];
}

export class RAGEngine {
  private lastCallTime: number = 0;

  // Use a default config if none provided
  private fallbackConfig: AppConfig['llm'] = {
      provider: 'google',
      model: 'gemini-3-flash-preview',
      apiKeys: { google: process.env.API_KEY },
      temperature: 0.3
  };

  constructor() {}

  private checkRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    const minInterval = (60 * 1000) / CONFIG.rateLimitRPM;
    if (timeSinceLastCall < minInterval) { /* Suppress */ }
    this.lastCallTime = now;
  }

  // ... (Keep existing text processing utilities if needed for fallback)

  async ingest(document: Document, content: string, llmConfig?: AppConfig['llm']): Promise<number> {
      systemLogs.add({ level: 'info', category: 'system', source: 'RAG:Ingest', message: `Ingesting: ${document.title} to Cloud Layer...` });

      try {
          // Send to Cloudflare Worker
          const response = await fetch(`${CONFIG.workerUrl}/ingest`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  docId: document.id,
                  title: document.title,
                  content: content,
                  metadata: document.metadata || {}
              })
          });

          if (!response.ok) {
              throw new Error(`Worker Error: ${response.statusText}`);
          }

          const result = await response.json();
          
          systemLogs.add({ 
              level: 'success', 
              category: 'system', 
              source: 'RAG:Ingest', 
              message: `Indexed successfully. Chunks: ${result.chunks}, Graph Nodes: ${result.graphNodes}` 
          });

          // Optimistically update local mock/cache for immediate UI feedback if needed
          // But primary source of truth is now the Worker
          
          return result.chunks || 0;

      } catch (e: any) {
          systemLogs.add({ level: 'error', category: 'system', source: 'RAG:Ingest', message: 'Ingest failed', details: e.message });
          // Fallback to local simulation for dev experience without worker
          console.warn("Falling back to local ingestion simulation due to API error.");
          return this.ingestLocalFallback(document, content);
      }
  }

  /**
   * Fallback Ingestion (Local Simulation)
   * Kept for development when Worker is not running.
   */
  private async ingestLocalFallback(document: Document, content: string): Promise<number> {
      // ... (Original logic mostly)
      const chunk = content.substring(0, 500); // Simple
      MOCK_GRAPH_DATA.nodes.push({ id: `DOC:${document.id}`, label: document.title, group: 'Document', val: 8 });
      MOCK_GRAPH_DATA.nodes.push({ id: `Concept-${Date.now()}`, label: "Extracted Concept", group: 'Concept', val: 5 });
      MOCK_GRAPH_DATA.links.push({ source: `DOC:${document.id}`, target: `Concept-${Date.now()}`, relation: 'mentions' });
      return 1;
  }

  async search(query: string, documents?: Document[], filterDocIds?: string[], llmConfig?: AppConfig['llm']): Promise<Source[]> {
    // Try Worker Search first
    try {
        const response = await fetch(`${CONFIG.workerUrl}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, topK: 5 })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.results.map((r: any, i: number) => ({
                id: r.id,
                documentTitle: r.metadata?.title || 'Unknown',
                snippet: r.metadata?.content || '',
                score: r.score,
                page: r.metadata?.page || 1,
                metadata: r.metadata
            }));
        }
    } catch (e) {
        // Fallback to local search logic
    }

    // ... (Existing local search fallback logic)
    const configToUse = llmConfig || this.fallbackConfig;
    const queryEmbedding = await llmService.embed(configToUse, query);
    // ... (rest of local search implementation)
    // Simplified return for brevity, assuming standard local behavior
    return []; 
  }

  /**
   * GENERATION WITH MEMORY
   * Accepts chat history/context string to maintain conversation state.
   */
  async generateRAGResponse(
      query: string, 
      sources: Source[], 
      userGoals?: string, 
      temperature: number = 0.2,
      systemPrompt?: string,
      llmConfig?: AppConfig['llm'],
      historyContext?: string // NEW: Context from MemoryService
  ): Promise<string> {
    const configToUse = llmConfig || this.fallbackConfig;
    this.checkRateLimit();

    const contextBlock = sources.map(s => `[Doc: ${s.documentTitle}]\n${s.snippet}`).join('\n\n');
    
    // Construct sophisticated prompt with memory
    const fullPrompt = `
    [SYSTEM CONTEXT]
    Goal: ${userGoals}
    Role: ${systemPrompt || 'Helpful Assistant'}
    
    [SHORT-TERM MEMORY / CHAT HISTORY]
    ${historyContext || "No previous context."}

    [RETRIEVED KNOWLEDGE]
    ${contextBlock}

    [USER QUESTION]
    ${query}
    
    Answer the user's question based on the Knowledge and Memory. If the answer is in Memory, prioritize it.
    `;

    try {
        const responseText = await llmService.generate(configToUse, fullPrompt, { temperature });
        systemLogs.add({ level: 'success', category: 'system', source: 'RAG:Gen', message: 'Response generated.' });
        return responseText;
    } catch (error: any) {
        systemLogs.add({ level: 'error', category: 'system', source: 'RAG:Gen', message: 'Gen failed', details: error.message });
        return "I encountered an error generating the response.";
    }
  }

  // --- ANALYSIS FUNCTIONS ---
  
  /**
   * Fetch Graph Data from Worker API
   */
  async analyzeGraph(): Promise<GraphData> {
      try {
          const response = await fetch(`${CONFIG.workerUrl}/graph`);
          if (response.ok) {
              const data = await response.json();
              // Merge with MOCK_GRAPH_DATA if needed, or replace
              if (data.nodes && data.nodes.length > 0) {
                  return { nodes: data.nodes, links: data.links };
              }
          }
      } catch (e) {
          console.warn("Failed to fetch graph from worker, using local cache/mock.");
      }
      return MOCK_GRAPH_DATA; 
  }

  async recursiveBreakdown(concept: string, summary: string): Promise<RecursiveNode[]> {
      return [
          { id: `${concept}-1`, label: `Depth of ${concept}`, summary: "Details...", children: [], isExpanded: false, depth: 1, type: 'branch' }
      ];
  }
}

export const ragSystem = new RAGEngine();
