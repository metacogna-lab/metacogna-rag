
import { AnalyzedSession, TrainingExample } from "../types";
import { memoryService } from "./MemoryService";
import { llmService } from "./LLMService";
import { trainingService } from "./TrainingDataService";
import { DEFAULT_CONFIG } from "../constants";

const STORAGE_KEY_ANALYSIS = 'pratejra_session_analysis';

class SessionAnalysisService {
    private sessions: AnalyzedSession[] = [];

    constructor() {
        this.load();
    }

    private load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY_ANALYSIS);
            if (data) {
                this.sessions = JSON.parse(data);
            }
        } catch (e) {
            console.error("Failed to load analysis sessions", e);
        }
    }

    private save() {
        try {
            localStorage.setItem(STORAGE_KEY_ANALYSIS, JSON.stringify(this.sessions));
        } catch (e) {
            console.error("Failed to save analysis sessions", e);
        }
    }

    getSessions(): AnalyzedSession[] {
        return this.sessions;
    }

    async analyzeAndSave(streamId: string, type: 'chat' | 'agent'): Promise<AnalyzedSession | null> {
        // 1. Retrieve full medium-term memory (the narrative)
        const memoryLog = memoryService.getMediumTermMemory(streamId);
        if (!memoryLog) return null;

        // 2. Perform AI Analysis
        const prompt = `
        Analyze the following session log.
        LOG:
        ${memoryLog}

        TASKS:
        1. Summarize the session in 2-3 sentences.
        2. If the user defined or used a structured data format, extract a JSON Schema for it. Otherwise return null.
        3. Create 1 high-quality Fine-Tuning example (System, User, Assistant) based on the best turn in this session.

        OUTPUT JSON:
        {
            "summary": "string",
            "schema": "string or null",
            "trainingExample": { "input": { "system": "...", "user": "..." }, "output": "..." }
        }
        `;

        try {
            const responseStr = await llmService.generate(DEFAULT_CONFIG.llm, prompt, { 
                temperature: 0.2,
                jsonSchema: {
                    type: "OBJECT",
                    properties: {
                        summary: { type: "STRING" },
                        schema: { type: "STRING" },
                        trainingExample: { 
                            type: "OBJECT",
                            properties: {
                                input: { type: "OBJECT", properties: { system: {type: "STRING"}, user: {type: "STRING"} } },
                                output: { type: "STRING" }
                            }
                        }
                    }
                }
            });

            const result = JSON.parse(responseStr);

            const newSession: AnalyzedSession = {
                id: `analysis-${Date.now()}`,
                timestamp: Date.now(),
                streamId,
                type,
                summary: result.summary || "Analysis failed.",
                extractedSchema: result.schema,
                datasetPreview: result.trainingExample ? [{
                    id: `ft-${Date.now()}`,
                    timestamp: Date.now(),
                    source: type === 'chat' ? 'rag_chat' : 'agent_simulation',
                    model_used: DEFAULT_CONFIG.llm.model,
                    input: {
                        system: result.trainingExample.input?.system,
                        user: result.trainingExample.input?.user,
                        context: "Derived from session analysis"
                    },
                    output: result.trainingExample.output
                }] : [],
                fullLog: memoryLog
            };

            this.sessions.unshift(newSession);
            this.save();
            return newSession;

        } catch (e) {
            console.error("Session analysis failed", e);
            return null;
        }
    }

    promoteToFineTuning(sessionId: string) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (session && session.datasetPreview) {
            session.datasetPreview.forEach(ex => trainingService.saveExample(ex));
        }
    }

    deleteSession(id: string) {
        this.sessions = this.sessions.filter(s => s.id !== id);
        this.save();
    }
    
    clear() {
        this.sessions = [];
        this.save();
    }
}

export const sessionAnalysisService = new SessionAnalysisService();
