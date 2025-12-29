

import { Type } from "@google/generative-ai";
import { AgentGoal, AgentTurn, Idea, AppConfig, AgentAction } from "../types";
import { trainingService } from "./TrainingDataService";
import { llmService } from "./LLMService";
import { systemLogs } from "./LogService";
import { memoryService } from "./MemoryService";

export const MAX_TURNS = 10; // Increased for deeper memory usage

const SYSTEM_INSTRUCTION_BASE = `You are the Pratejra Agent System simulating a cognitive graph process.
You act as 'Coordinator' (Execution, Synthesis) and 'Critic' (Refinement, Breaking down).

MEMORY PROTOCOL:
- You operate within a specific STREAM ID. 
- You have access to Short-Term (immediate), Medium-Term (session), and Long-Term (RAG) memory.
- You can REQUEST context from other streams if you are provided a valid 'targetStreamId'.

OUTPUT FORMAT:
Return a JSON object matching this schema:
{
  "agentName": "Coordinator" | "Critic",
  "thought": "Short reasoning string. Reference memory if used.",
  "action": "MERGE" | "EXPLODE" | "SHAKE" | "READ_STREAM" | "IDLE",
  "targetBlockIds": ["id1", "id2"],
  "targetStreamId": "optional_stream_id_to_read",
  "outputContent": "The resulting text content."
}

LOGIC:
- MERGE: Combine ideas.
- EXPLODE: Break down ideas.
- SHAKE: Refine/Critique.
- READ_STREAM: Use this action if you need to fetch context from another agent stream (requires targetStreamId).
`;

export const AGENT_PROMPTS = {
    Coordinator: "You are the Coordinator. Synthesize and Build. Check Short-Term memory to avoid repeating recent actions. Use Long-Term memory to ground ideas.",
    Critic: "You are the Critic. Question and Refine. Look for inconsistencies in the Medium-Term history. If you see a reference to another stream, use READ_STREAM."
};

const DEFAULT_LLM_CONFIG: AppConfig['llm'] = {
    provider: 'google',
    model: 'gemini-3-flash-preview',
    apiKeys: { google: process.env.API_KEY },
    temperature: 0.5
};

export class AgentGraphService {
    
    constructor() {}

    async generateInitialBlocks(topic: string, model: string, llmConfig?: AppConfig['llm']): Promise<Idea[]> {
        // ... (Keep existing implementation for brevity, logic remains same)
        const configToUse = llmConfig || { ...DEFAULT_LLM_CONFIG, model: model };
        const prompt = `Break down: ${topic} into 4-6 concepts. JSON: { "concepts": [{ "label": "string", "type": "concept"|"constraint"|"data" }] }`;
        
        try {
            const schema = {
                type: Type.OBJECT,
                properties: {
                    concepts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, type: { type: Type.STRING } } } }
                }
            };
            const jsonStr = await llmService.generate(configToUse, prompt, { jsonSchema: schema, temperature: 0.7 });
            const json = JSON.parse(jsonStr || '{ "concepts": [] }');
            
            return json.concepts.map((c: any, i: number) => ({
                id: `init-${i}-${Date.now()}`,
                content: c.label,
                type: c.type || 'concept',
                strength: 1,
                x: 20 + (i % 3) * 30 + (Math.random() * 10 - 5), 
                y: 20 + Math.floor(i / 3) * 30 + (Math.random() * 10 - 5),
                shape: 'square', color: '#10b981', scale: 1
            }));
        } catch (error) { return []; }
    }

    async generateTurn(
        streamId: string, // NEW: Require Stream ID
        goal: AgentGoal,
        history: AgentTurn[], // Visual history (UI)
        ideas: Idea[],
        turnCount: number,
        model: string,
        customPrompts?: { Coordinator: string; Critic: string },
        llmConfig?: AppConfig['llm']
    ): Promise<AgentTurn> {
        const configToUse = llmConfig || { ...DEFAULT_LLM_CONFIG, model: model };
        const currentAgent = turnCount % 2 === 0 ? 'Coordinator' : 'Critic';
        const specificInstruction = customPrompts ? customPrompts[currentAgent] : AGENT_PROMPTS[currentAgent];
        
        systemLogs.add({ level: 'info', category: 'agent', source: `Agent:${currentAgent}`, message: `Thinking (Stream: ${streamId})...` });

        // 1. Fetch Memory Context
        const shortTerm = memoryService.getShortTermMemory(streamId);
        const mediumTerm = memoryService.getMediumTermMemory(streamId);
        
        const ideaContext = ideas.map(b => `[ID: ${b.id}]: ${b.content}`).join('\n');

        const prompt = `
        CURRENT STREAM ID: ${streamId}
        GOAL: ${goal.type} - ${goal.description}
        AGENT: ${currentAgent}
        
        [MEMORY - SHORT TERM]:
        ${shortTerm || "None"}

        [MEMORY - MEDIUM TERM (Summary)]:
        ${mediumTerm || "None"}
        
        [WORKSPACE IDEAS]:
        ${ideaContext}

        INSTRUCTION: ${specificInstruction}
        `;

        const schema = {
            type: Type.OBJECT,
            properties: {
                agentName: { type: Type.STRING },
                thought: { type: Type.STRING },
                action: { type: Type.STRING, enum: ["MERGE", "EXPLODE", "SHAKE", "READ_STREAM", "IDLE"] },
                targetBlockIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                targetStreamId: { type: Type.STRING },
                outputContent: { type: Type.STRING }
            }
        };

        const jsonStr = await llmService.generate(configToUse, prompt, {
            systemInstruction: SYSTEM_INSTRUCTION_BASE,
            jsonSchema: schema,
            temperature: 0.5
        });

        const json = JSON.parse(jsonStr || '{}');

        // Handle Cross-Stream Context
        if (json.action === 'READ_STREAM' && json.targetStreamId) {
            const remoteContext = memoryService.shareContext(json.targetStreamId);
            json.outputContent = `Fetched: ${remoteContext}`;
            json.thought += ` [Accessed Remote Stream: ${json.targetStreamId}]`;
        }

        // Log to Memory Service
        memoryService.addFrame(streamId, {
            agentName: currentAgent,
            input: `Turn ${turnCount}`,
            thought: json.thought,
            action: json.action,
            output: json.outputContent,
            tags: [json.action]
        });

        systemLogs.add({ level: 'success', category: 'agent', source: `Agent:${currentAgent}`, message: `Action: ${json.action}`, details: json.thought });

        // Save Training Data
        trainingService.saveExample({
            source: 'agent_simulation',
            model_used: model,
            input: {
                system: SYSTEM_INSTRUCTION_BASE,
                user: `Goal: ${goal.label}. Stream: ${streamId}`,
                context: mediumTerm
            },
            output: jsonStr
        });

        return {
            step: turnCount + 1,
            agentName: currentAgent,
            thought: json.thought || "Processing...",
            action: {
                type: (json.action as AgentAction['type']) || "IDLE",
                targetBlockIds: json.targetBlockIds || [],
                description: json.action
            },
            outputContent: json.outputContent || ""
        };
    }
}

export const agentService = new AgentGraphService();
export const AGENT_GOALS: AgentGoal[] = [
    { id: 'g1', type: 'synthesis', label: 'Synthesis Engine', description: 'Combine disparate blocks into a unified theory.', systemPrompt: 'Focus on finding commonalities.' },
    { id: 'g2', type: 'creation', label: 'Creative Forge', description: 'Use blocks as inspiration to generate new ideas.', systemPrompt: 'Be speculative.' },
    { id: 'g3', type: 'questioning', label: 'Socratic Critic', description: 'Break blocks apart to find logical gaps.', systemPrompt: 'Be critical.' }
];