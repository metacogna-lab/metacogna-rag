
import { AppConfig, SupervisorDecision, MetaPolicy, ViewState } from "../types";
import { llmService } from "./LLMService";
import { memoryService } from "./MemoryService";
import { systemLogs } from "./LogService";

const META_MEMORY_KEY = 'pratejra_supervisor_meta';

class SupervisorService {
    private decisionLog: SupervisorDecision[] = [];
    private metaMemory: MetaPolicy[] = [];
    private listeners: ((advice: SupervisorDecision[]) => void)[] = [];
    private isProcessing: boolean = false;

    private readonly MONITOR_INTERVAL = 45000; // Check every 45s
    private timer: any;
    private hasCheckedProfile: boolean = false;

    constructor() {
        this.loadMetaMemory();
    }

    private loadMetaMemory() {
        try {
            const data = localStorage.getItem(META_MEMORY_KEY);
            if (data) this.metaMemory = JSON.parse(data);
        } catch (e) {
            console.error("Failed to load Supervisor Meta-Memory");
        }
    }

    private saveMetaMemory() {
        localStorage.setItem(META_MEMORY_KEY, JSON.stringify(this.metaMemory));
    }

    startMonitoring(config: AppConfig, currentStreamId: string) {
        if (this.timer) clearInterval(this.timer);
        
        if (!this.hasCheckedProfile) {
            this.checkProfileCompleteness(config);
            this.hasCheckedProfile = true;
        }

        this.timer = setInterval(() => {
            if (currentStreamId) {
                this.analyzeSession(config, currentStreamId);
            }
        }, this.MONITOR_INTERVAL);
    }

    stopMonitoring() {
        if (this.timer) clearInterval(this.timer);
    }

    // --- Core Architecture: The Global Workspace Loop ---

    async analyzeSession(config: AppConfig, streamId: string) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // 1. INGEST
            const shortTerm = memoryService.getShortTermMemory(streamId, 6);
            const mediumTerm = memoryService.getMediumTermMemory(streamId);
            
            if (!shortTerm || shortTerm.length < 50) {
                this.isProcessing = false;
                return;
            }

            // 2. CONTEXT PREPARATION
            const userProfile = {
                goals: config.userGoals,
                dreams: config.userDreams,
                // In a real app, these values would be explicitly defined in settings
                values: ["Accuracy > Speed", "Transparency > Magic", "Security > Convenience"] 
            };

            const policyContext = this.metaMemory.map(p => `- Policy: ${p.rule}`).join('\n');

            // 3. REFLECT (Prompt Engineering)
            const prompt = `
ROLE DEFINITION:
You are the SUPERVISOR SUPER AGENT, a metacognitive orchestration layer that monitors and regulates the entire system.
Your core responsibility: Evaluate, inhibit, and refine system decisions - you do NOT execute tasks directly.

USER PROFILE (The Ego - System's Core Identity):
Goals: ${userProfile.goals}
Dreams: ${userProfile.dreams}
Core Values: ${JSON.stringify(userProfile.values)}

INTERNAL META-MEMORY (Your Learned Policies):
${policyContext || "No custom policies yet."}

CURRENT STREAM INPUT (Subordinate Agent Activity):
${shortTerm}

---
EXECUTE COGNITIVE LOOP (Follow this sequence):

1. **Inhibitory Control**: 
   - Does the recent agent activity violate user values or goals?
   - Is the activity aligned with the user's stated objectives?
   - Are there ethical or safety concerns?

2. **Counterfactual Simulation**: 
   - If this activity continues unchanged, what is the worst-case downstream effect?
   - What are the potential unintended consequences?
   - How might this impact the user's goals and values?

3. **Epistemic Humility**: 
   - Calculate a Confidence Score (0-100%) for the current trajectory
   - Consider: data quality, reasoning soundness, goal alignment
   - Acknowledge uncertainty when present

4. **Recursive Self-Correction**: 
   - Do you need to update your internal policies based on this interaction?
   - What patterns are emerging that should inform future decisions?
   - Are there systemic issues that need addressing?

OUTPUT JSON SCHEMA:
{
    "type": "inhibit" | "allow" | "request_guidance",
    "confidenceScore": number (0-100),
    "simulationResult": "string (Short description of worst-case or expected outcome)",
    "internalReasoning": "string (Your hidden chain of thought)",
    "userMessage": "string (Transparent explanation to the user. If inhibiting, explain why. If requesting guidance, present options.)",
    "newPolicy": "string (Optional: A new rule to add to your Meta-Memory if a correction is needed)",
    "relevantGoal": "string (Which user goal is at stake)"
}
            `;

            const jsonStr = await llmService.generate(config.llm, prompt, {
                jsonSchema: {
                    type: "OBJECT",
                    properties: {
                        type: { type: "STRING", enum: ["inhibit", "allow", "request_guidance"] },
                        confidenceScore: { type: "INTEGER" },
                        simulationResult: { type: "STRING" },
                        internalReasoning: { type: "STRING" },
                        userMessage: { type: "STRING" },
                        newPolicy: { type: "STRING" },
                        relevantGoal: { type: "STRING" }
                    },
                    required: ["type", "confidenceScore", "simulationResult", "userMessage"]
                },
                temperature: 0.1 // High determinism for supervisor
            });

            const result = JSON.parse(jsonStr);

            // 4. FILTER & BROADCAST
            
            // Update Meta-Memory if needed
            if (result.newPolicy) {
                this.metaMemory.push({
                    id: `pol-${Date.now()}`,
                    rule: result.newPolicy,
                    createdContext: result.simulationResult,
                    weight: 1
                });
                this.saveMetaMemory();
            }

            const decision: SupervisorDecision = {
                id: `sup-${Date.now()}`,
                timestamp: Date.now(),
                type: result.type,
                confidenceScore: result.confidenceScore,
                simulationResult: result.simulationResult,
                reasoning: result.internalReasoning,
                userMessage: result.userMessage,
                relevantGoal: result.relevantGoal || "General Alignment",
                policyUpdate: result.newPolicy,
                displayMode: (result.type === 'inhibit' || result.type === 'request_guidance' || result.confidenceScore < 70) ? 'toast' : 'widget',
            };

            this.decisionLog.unshift(decision);
            this.notify();
            
            systemLogs.add({ 
                level: result.type === 'inhibit' ? 'warn' : 'info', 
                category: 'supervisor', 
                source: 'GlobalWorkspace', 
                message: `Decision: ${result.type.toUpperCase()} (${result.confidenceScore}%)`,
                details: { simulation: result.simulationResult, policy: result.newPolicy }
            });

        } catch (e) {
            console.error("Supervisor Meta-Cognition Failed", e);
        } finally {
            this.isProcessing = false;
        }
    }

    async checkProfileCompleteness(config: AppConfig) {
        const hasGoals = config.userGoals && config.userGoals.length > 10;
        const hasDreams = config.userDreams && config.userDreams.length > 5;

        if (hasGoals && hasDreams) return;

        const advice: SupervisorDecision = {
            id: `sup-prof-${Date.now()}`,
            timestamp: Date.now(),
            type: 'request_guidance',
            confidenceScore: 100,
            simulationResult: "Without goals, system drift is inevitable.",
            reasoning: "Profile is incomplete.",
            userMessage: "I notice you haven't set concrete Goals or Dreams. Defining them helps me align my inhibitory control.",
            relevantGoal: "System Configuration",
            displayMode: 'toast',
            actionLabel: 'Update Profile',
            actionLink: ViewState.MY_PROFILE
        };

        this.decisionLog.unshift(advice);
        this.notify();
    }

    getHistory() { return this.decisionLog; }

    subscribe(fn: (advice: SupervisorDecision[]) => void) {
        this.listeners.push(fn);
        fn(this.decisionLog);
        return () => { this.listeners = this.listeners.filter(l => l !== fn); };
    }

    private notify() {
        this.listeners.forEach(l => l(this.decisionLog));
    }
}

export const supervisorService = new SupervisorService();
