
import { ChromaClient, Collection } from 'chromadb';

// Configuration constants
const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
export const COLLECTION_NAME = "pratejra-knowledge-base";

// Initialize Client
export const chroma = new ChromaClient({
  path: CHROMA_URL,
});

/**
 * Initializes the vector collection with specific distance metric.
 * Supports: 'l2' (squared L2), 'ip' (inner product), 'cosine'.
 */
export const initVectorStore = async (): Promise<Collection> => {
  try {
    const collection = await chroma.getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: { 
        "hnsw:space": "cosine" // Optimized for semantic similarity
      }
    });
    console.log(`[Chroma] Connected to collection: ${COLLECTION_NAME}`);
    return collection;
  } catch (error) {
    console.error("[Chroma] Failed to initialize collection:", error);
    // Optional: Retry logic could go here
    throw error;
  }
};

/**
 * Helper to delete the collection (Reset)
 */
export const resetVectorStore = async () => {
    try {
        await chroma.deleteCollection({ name: COLLECTION_NAME });
        await initVectorStore();
        console.log("[Chroma] Vector store reset successfully.");
    } catch (e) {
        console.error("[Chroma] Error resetting store", e);
    }
}

/**
 * Helper to check system health
 */
export const checkChromaHealth = async (): Promise<boolean> => {
    try {
        const heartbeat = await chroma.heartbeat();
        return heartbeat > 0;
    } catch (e) {
        return false;
    }
}
