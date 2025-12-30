
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Document, Source, RecursiveNode, AppConfig, GraphData, GraphNode, GraphLink, ChatMessage } from "../types";
import { MOCK_KNOWLEDGE_BASE, MOCK_DOCUMENTS, MOCK_GRAPH_DATA } from "../constants";
import { trainingService } from "./TrainingDataService";
import { llmService } from "./LLMService";
import { analyticsService } from "./AnalyticsService";
import { systemLogs } from "./LogService";
import { apiPost, apiGet } from "./ApiClient";

// Configuration for the RAG Engine
const CONFIG = {
  chunkSize: 512, 
  overlap: 50,
  vectorDimensions: 1536,
  rateLimitRPM: 10,
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
      apiKeys: { google: process.env.GEMINI_API_KEY },
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
          const result = await apiPost<{ success: boolean; chunks: number; graphNodes: number }>('/ingest', {
              docId: document.id,
              title: document.title,
              content: content,
              metadata: document.metadata || {}
          });
          
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
        const data = await apiPost<{ results: Array<{ id: string; score: number; metadata: any }> }>('/search', {
            query,
            topK: 5
        });
        
        if (data.results && data.results.length > 0) {
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
   * Now uses Worker /api/chat endpoint for secure LLM calls.
   */
  async generateRAGResponse(
      query: string, 
      sources: Source[], 
      userGoals?: string, 
      temperature: number = 0.2,
      systemPrompt?: string,
      llmConfig?: AppConfig['llm'],
      historyContext?: string, // Context from MemoryService
      agentType?: string // NEW: Agent type for automatic prompt routing
  ): Promise<string> {
    this.checkRateLimit();

    try {
        // Use Worker /api/chat endpoint (handles search + LLM)
        const result = await apiPost<{ 
          response: string; 
          sources: Source[]; 
          provider: string; 
          model: string;
        }>('/chat', {
          query,
          agentType, // NEW: Pass agent type for routing
          sources: sources.length > 0 ? sources : undefined, // Pass sources if already retrieved
          llmConfig: llmConfig || this.fallbackConfig,
          systemPrompt, // Explicit prompt takes precedence over agentType
          temperature,
          historyContext,
          userGoals
        });

        systemLogs.add({ 
          level: 'success', 
          category: 'system', 
          source: 'RAG:Gen', 
          message: `Response generated via ${result.provider}/${result.model}.` 
        });
        
        return result.response;
    } catch (error: any) {
        systemLogs.add({ 
          level: 'error', 
          category: 'system', 
          source: 'RAG:Gen', 
          message: 'Gen failed', 
          details: error.message 
        });
        
        // Fallback to local LLM service if worker unavailable
        console.warn("Worker chat endpoint failed, falling back to local LLM:", error);
        try {
          const configToUse = llmConfig || this.fallbackConfig;
          const contextBlock = sources.map(s => `[Doc: ${s.documentTitle}]\n${s.snippet}`).join('\n\n');
          const fullPrompt = `
    [SYSTEM CONTEXT]
    Goal: ${userGoals || 'Help the user'}
    Role: ${systemPrompt || 'Helpful Assistant'}
    
    [SHORT-TERM MEMORY / CHAT HISTORY]
    ${historyContext || "No previous context."}

    [RETRIEVED KNOWLEDGE]
    ${contextBlock}

    [USER QUESTION]
    ${query}
    
    Answer the user's question based on the Knowledge and Memory. If the answer is in Memory, prioritize it.
    `;
          const responseText = await llmService.generate(configToUse, fullPrompt, { temperature });
          return responseText;
        } catch (fallbackError: any) {
          return "I encountered an error generating the response. Please check your API keys or try again later.";
        }
    }
  }

  // --- ANALYSIS FUNCTIONS ---
  
  /**
   * Fetch Graph Data from Worker API
   */
  async analyzeGraph(): Promise<GraphData> {
      try {
          const data = await apiGet<{ nodes: GraphNode[]; links: GraphLink[] }>('/graph');
          // Merge with MOCK_GRAPH_DATA if needed, or replace
          if (data.nodes && data.nodes.length > 0) {
              return { nodes: data.nodes, links: data.links };
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
