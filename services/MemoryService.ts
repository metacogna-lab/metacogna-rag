
import { MemoryFrame, StreamContext } from "../types";
import { ragSystem } from "./RAGEngine";
import { systemLogs } from "./LogService";

const STORAGE_KEY_STREAMS = 'pratejra_memory_streams';

class MemoryService {
    private streams: Map<string, StreamContext> = new Map();

    constructor() {
        this.load();
    }

    private load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY_STREAMS);
            if (data) {
                const parsed = JSON.parse(data);
                Object.values(parsed).forEach((s: any) => this.streams.set(s.streamId, s));
            }
        } catch (e) {
            console.error("Failed to load memory streams", e);
        }
    }

    private save() {
        try {
            const obj = Object.fromEntries(this.streams);
            localStorage.setItem(STORAGE_KEY_STREAMS, JSON.stringify(obj));
        } catch (e) {
            console.error("Failed to save memory streams", e);
        }
    }

    // --- Stream Management ---

    createStream(goal: string): string {
        const streamId = `stream-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        this.streams.set(streamId, {
            streamId,
            startedAt: Date.now(),
            goal,
            status: 'active',
            frames: []
        });
        this.save();
        systemLogs.add({ level: 'info', category: 'system', source: 'Memory', message: `Created Stream: ${streamId}` });
        return streamId;
    }

    addFrame(streamId: string, frame: Omit<MemoryFrame, 'id' | 'streamId' | 'timestamp'>) {
        const stream = this.streams.get(streamId);
        if (!stream) {
            console.warn(`Stream ${streamId} not found`);
            return;
        }

        const newFrame: MemoryFrame = {
            ...frame,
            id: `mem-${Date.now()}`,
            streamId,
            timestamp: Date.now()
        };

        stream.frames.push(newFrame);
        this.save();
    }

    // --- Retrieval Tiers ---

    /**
     * Short Term: Immediate working memory (e.g., last 3 turns).
     * Used for immediate context coherence.
     */
    getShortTermMemory(streamId: string, limit: number = 3): string {
        const stream = this.streams.get(streamId);
        if (!stream) return "";
        
        const recent = stream.frames.slice(-limit);
        return recent.map(f => 
            `[ShortTerm] ${f.agentName}: ${f.thought} -> Action: ${f.action} -> Output: ${f.output}`
        ).join('\n');
    }

    /**
     * Medium Term: The entire narrative arc of the current stream.
     * Used for goal alignment and checking repetition.
     */
    getMediumTermMemory(streamId: string): string {
        const stream = this.streams.get(streamId);
        if (!stream) return "";

        return `STREAM GOAL: ${stream.goal}\n` + 
               stream.frames.map(f => `Step: ${f.action} by ${f.agentName}`).join('\n');
    }

    /**
     * Long Term: Cross-stream knowledge.
     * Usually retrieved via RAG, but here we can check archived streams.
     * If 'query' is provided, we search other streams.
     */
    async getLongTermMemory(query: string): Promise<string> {
        // In a real system, this would vector search the 'streams' database.
        // Here we simulated it by searching completed streams.
        let results = [];
        for (const [id, stream] of this.streams.entries()) {
            if (stream.status === 'archived' && (stream.goal.includes(query) || JSON.stringify(stream.frames).includes(query))) {
                results.push(`[Archived Stream ${id}]: Goal - ${stream.goal}`);
            }
        }
        return results.join('\n');
    }

    /**
     * Context Sharing: Allows an agent to "Peek" into another stream by ID.
     */
    shareContext(targetStreamId: string): string {
        const stream = this.streams.get(targetStreamId);
        if (!stream) return `[System]: Stream ${targetStreamId} not found or access denied.`;
        
        const summary = stream.frames.slice(-5).map(f => `${f.agentName} did ${f.action}`).join(', ');
        return `[Remote Context ${targetStreamId}]\nGoal: ${stream.goal}\nRecent Activity: ${summary}`;
    }

    archiveStream(streamId: string) {
        const stream = this.streams.get(streamId);
        if (stream) {
            stream.status = 'archived';
            this.save();
            // Optional: Send to RAG for indexing
            ragSystem.ingest({
                id: streamId,
                title: `Agent Stream: ${stream.goal}`,
                type: 'txt',
                size: '1KB',
                uploadDate: new Date().toISOString(),
                status: 'indexed',
                chunkCount: 1,
                metadata: { type: 'memory_stream' }
            }, JSON.stringify(stream.frames));
        }
    }
}

export const memoryService = new MemoryService();
