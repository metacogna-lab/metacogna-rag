
import React, { useState, useEffect, useRef } from 'react';
import { PaperCard, PaperButton, PaperBadge, MarkdownText } from '../components/PaperComponents';
import { PRODUCT_X_WORKFLOW, WorkflowStep, RefinerRule } from '../services/ProductXConfig';
import { 
    FileText, Palette, Database, Server, Webhook, Layout, Rocket, 
    ArrowRight, CheckCircle, AlertOctagon, RefreshCw, Send, BrainCircuit,
    ChevronRight, Play, Shield
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppConfig } from '../types';

// Map string icon names to Lucide components
const ICON_MAP: Record<string, any> = {
    FileText, Palette, Database, Server, Webhook, Layout, Rocket
};

interface ProductXViewProps {
    config: AppConfig;
}

interface StepState {
    output: string;
    validation: string;
    status: 'pending' | 'generating' | 'generated' | 'validating' | 'validated';
}

export const ProductXView: React.FC<ProductXViewProps> = ({ config }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [refinerInput, setRefinerInput] = useState('');
    const [workflowState, setWorkflowState] = useState<Record<string, StepState>>({});
    const [isRefining, setIsRefining] = useState(false);
    
    // Auto-scroll refs
    const outputRef = useRef<HTMLDivElement>(null);
    const validationRef = useRef<HTMLDivElement>(null);

    const currentStep = PRODUCT_X_WORKFLOW.steps[currentStepIndex];
    const currentState = workflowState[currentStep.id] || { output: '', validation: '', status: 'pending' };

    const getIcon = (name: string) => {
        const Icon = ICON_MAP[name] || FileText;
        return <Icon size={18} />;
    };

    const updateStepState = (id: string, partial: Partial<StepState>) => {
        setWorkflowState(prev => ({
            ...prev,
            [id]: { ...(prev[id] || { output: '', validation: '', status: 'pending' }), ...partial }
        }));
    };

    const runGeneration = async () => {
        if (!userInput.trim() && currentStepIndex === 0) return;
        
        updateStepState(currentStep.id, { status: 'generating' });
        
        try {
            const apiKey = (config.llm.apiKeys.google || (typeof process !== 'undefined' && process.env?.API_KEY) ? process.env.API_KEY : import.meta.env.VITE_API_KEY || '').trim();
            const ai = new GoogleGenerativeAI(apiKey);

            // Gather context from previous steps
            let contextAccumulator = "";
            for (let i = 0; i < currentStepIndex; i++) {
                const prevStep = PRODUCT_X_WORKFLOW.steps[i];
                const prevOutput = workflowState[prevStep.id]?.output;
                if (prevOutput) {
                    contextAccumulator += `\n\n--- [CONTEXT: ${prevStep.title}] ---\n${prevOutput}`;
                }
            }

            // Replace Placeholder
            let prompt = currentStep.generationPrompt.replace('[USER_INPUT]', userInput || "the project defined in previous steps");
            
            // Add Context
            prompt += `\n\nPREVIOUS CONTEXT:${contextAccumulator}`;

            const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const response = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7 }
            });

            updateStepState(currentStep.id, { 
                output: response.response.text() || "Generation failed.", 
                status: 'generated' 
            });

        } catch (e) {
            updateStepState(currentStep.id, { output: "Error: API Failure.", status: 'pending' });
        }
    };

    const runValidation = async () => {
        if (!currentState.output) return;
        updateStepState(currentStep.id, { status: 'validating' });

        try {
            const apiKey = (config.llm.apiKeys.google || (typeof process !== 'undefined' && process.env?.API_KEY) ? process.env.API_KEY : import.meta.env.VITE_API_KEY || '').trim();
            const ai = new GoogleGenerativeAI(apiKey);

            const prompt = `${currentStep.validationPrompt}\n\nCONTENT TO AUDIT:\n${currentState.output}`;

            const validationModel = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const response = await validationModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 }
            });

            updateStepState(currentStep.id, { 
                validation: response.response.text() || "Validation failed.", 
                status: 'validated' 
            });

        } catch (e) {
            updateStepState(currentStep.id, { validation: "Error: Validation API Failure.", status: 'generated' });
        }
    };

    const handleRefiner = async () => {
        if (!refinerInput.trim()) return;
        setIsRefining(true);

        // Simple Keyword Matching for "Machine Logic" speed (could be LLM based)
        const lowerInput = refinerInput.toLowerCase();
        const matchedRule = PRODUCT_X_WORKFLOW.refiners.find(r => 
            r.keywords.some(k => lowerInput.includes(k))
        );

        if (matchedRule) {
            // Jump to step
            const targetIndex = PRODUCT_X_WORKFLOW.steps.findIndex(s => s.id === matchedRule.targetStepId);
            if (targetIndex !== -1) {
                setCurrentStepIndex(targetIndex);
                
                // Trigger an update on that step with the new overlay prompt
                updateStepState(matchedRule.targetStepId, { status: 'generating', output: '' });
                
                try {
                    const apiKey = (config.llm.apiKeys.google || (typeof process !== 'undefined' && process.env?.API_KEY) ? process.env.API_KEY : import.meta.env.VITE_API_KEY || '').trim();
                    const ai = new GoogleGenerativeAI(apiKey);
                    const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
                    
                    // Re-run the step with the pivot prompt + existing context
                    // We assume context exists if we are jumping back
                    const targetStep = PRODUCT_X_WORKFLOW.steps[targetIndex];
                    let context = workflowState[targetStep.id]?.output || ""; 
                    
                    const prompt = `${matchedRule.promptOverlay}\n\nUSER FEEDBACK: ${refinerInput}\n\nCURRENT ARTIFACT:\n${context}`;

                    const response = await model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }]
                    });

                    updateStepState(matchedRule.targetStepId, { 
                        output: response.response.text() || "Refinement failed.", 
                        status: 'generated',
                        validation: '' // Clear validation as output changed
                    });

                } catch (e) {
                    console.error(e);
                }
            }
        } else {
            // Fallback: Just answer the question using the current context
            alert("General question detected. (For this demo, try asking about 'Visuals', 'Performance', or 'Budget' to trigger the specific Refiners!)");
        }

        setRefinerInput('');
        setIsRefining(false);
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-end border-b-2 border-ink pb-4">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-ink flex items-center gap-3">
                        <BrainCircuit size={28} className="text-accent"/> ProductX Engine
                    </h2>
                    <p className="text-gray-500 font-mono text-sm mt-2">Autonomous Product Development Workflow</p>
                </div>
                
                {/* Refiner / Pivot Input */}
                <div className="flex items-center gap-2 w-1/2">
                    <div className="flex-1 relative">
                        <input 
                            value={refinerInput}
                            onChange={e => setRefinerInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRefiner()}
                            disabled={isRefining}
                            placeholder="Ask a question to Pivot (e.g. 'Make it prettier', 'Reduce scope')..."
                            className="w-full bg-white border-2 border-gray-300 pl-4 pr-10 py-2 rounded-sm text-sm focus:border-accent outline-none"
                        />
                        <button 
                            onClick={handleRefiner}
                            disabled={isRefining}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink"
                        >
                            {isRefining ? <RefreshCw size={14} className="animate-spin"/> : <Send size={14}/>}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-6 min-h-0">
                {/* Left: Stepper */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col p-4 gap-2 overflow-y-auto">
                    {PRODUCT_X_WORKFLOW.steps.map((step, idx) => {
                        const stepState = workflowState[step.id];
                        const isComplete = stepState?.status === 'validated';
                        const isActive = idx === currentStepIndex;
                        const hasData = !!stepState?.output;

                        return (
                            <button
                                key={step.id}
                                onClick={() => setCurrentStepIndex(idx)}
                                className={`
                                    flex items-center gap-3 p-3 rounded-sm text-left transition-all border-l-4
                                    ${isActive ? 'bg-white border-accent shadow-sm' : 'border-transparent hover:bg-gray-100'}
                                    ${hasData && !isActive ? 'border-gray-300' : ''}
                                `}
                            >
                                <div className={`
                                    p-2 rounded-full shrink-0
                                    ${isActive ? 'bg-ink text-white' : isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}
                                `}>
                                    {getIcon(step.icon)}
                                </div>
                                <div className="min-w-0">
                                    <div className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-ink' : 'text-gray-500'}`}>
                                        Step {idx + 1}
                                    </div>
                                    <div className="text-sm font-bold truncate text-ink">{step.title}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Right: Workspace */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    
                    {/* 1. Generator Panel */}
                    <PaperCard 
                        title={`Builder: ${currentStep.role}`} 
                        className="flex-1 flex flex-col min-h-0 border-accent"
                        action={
                            <PaperBadge color="blue">{currentState.status.toUpperCase()}</PaperBadge>
                        }
                    >
                        {currentStepIndex === 0 && !currentState.output && (
                            <div className="mb-4">
                                <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Product Definition</label>
                                <textarea 
                                    className="w-full p-4 border-2 border-gray-200 bg-gray-50 text-sm font-mono focus:border-ink outline-none h-24 resize-none"
                                    placeholder="Describe your idea (e.g. 'A social network for cat owners with AI matchmaking')..."
                                    value={userInput}
                                    onChange={e => setUserInput(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto bg-dot-pattern p-4 border border-gray-100 rounded-sm relative group" ref={outputRef}>
                            {currentState.output ? (
                                <div className="prose prose-sm max-w-none">
                                    <MarkdownText content={currentState.output} />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 opacity-50">
                                    {getIcon(currentStep.icon)}
                                    <span className="text-xs font-mono">Waiting for input...</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-between items-center pt-4 border-t border-gray-100">
                            <span className="text-xs text-gray-400 font-mono hidden md:inline-block truncate max-w-[300px]">
                                {currentStep.generationPrompt.substring(0, 60)}...
                            </span>
                            <PaperButton 
                                onClick={runGeneration} 
                                disabled={currentState.status === 'generating'}
                                icon={currentState.status === 'generating' ? <RefreshCw size={14} className="animate-spin"/> : <Play size={14}/>}
                            >
                                {currentState.output ? 'Regenerate' : 'Run Generation'}
                            </PaperButton>
                        </div>
                    </PaperCard>

                    {/* 2. Gatekeeper Panel */}
                    <div className={`transition-all duration-300 flex flex-col ${currentState.output ? 'h-1/3 opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
                        <div className="bg-ink text-white p-2 px-4 flex justify-between items-center rounded-t-sm">
                            <div className="flex items-center gap-2">
                                <Shield size={16} className="text-red-400"/>
                                <span className="font-bold text-xs uppercase tracking-widest">Gatekeeper Validation</span>
                            </div>
                            {currentState.status === 'validated' && (
                                <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                                    <CheckCircle size={14}/> Audit Complete
                                </div>
                            )}
                        </div>
                        <div className="bg-white border-2 border-t-0 border-ink p-4 flex-1 overflow-y-auto shadow-hard-lg" ref={validationRef}>
                            {currentState.validation ? (
                                <div className="prose prose-sm max-w-none text-gray-700">
                                    <MarkdownText content={currentState.validation} />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <button 
                                        onClick={runValidation} 
                                        disabled={currentState.status === 'validating'}
                                        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 hover:border-red-400 hover:text-red-500 rounded-sm text-gray-400 transition-colors"
                                    >
                                        {currentState.status === 'validating' ? <RefreshCw size={14} className="animate-spin"/> : <AlertOctagon size={14}/>}
                                        <span className="text-xs font-bold uppercase">Run Audit</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Navigation Footer */}
                    {currentState.status === 'validated' && currentStepIndex < PRODUCT_X_WORKFLOW.steps.length - 1 && (
                        <div className="flex justify-end animate-slide-in">
                            <PaperButton 
                                size="lg" 
                                onClick={() => setCurrentStepIndex(prev => prev + 1)}
                                icon={<ChevronRight size={18}/>}
                                className="shadow-hard-lg"
                            >
                                Proceed to {PRODUCT_X_WORKFLOW.steps[currentStepIndex + 1].title}
                            </PaperButton>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
