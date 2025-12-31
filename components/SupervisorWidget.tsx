
import React, { useState, useEffect } from 'react';
import { Eye, Check, AlertTriangle, Lightbulb, X, Activity, Shield, BrainCircuit, Play } from 'lucide-react';
import { SupervisorDecision } from '../types';
import { useAppStore, selectAuth } from '../store';

export const SupervisorWidget: React.FC = () => {
    const { userId } = useAppStore(selectAuth);
    const [history, setHistory] = useState<SupervisorDecision[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    // Fetch decisions from Worker API
    const fetchDecisions = async () => {
        if (!userId) return;

        try {
            const response = await fetch(`/api/supervisor/decisions?userId=${userId}`);
            if (!response.ok) return;

            const data = await response.json();
            const decisions = data.decisions || [];

            if (decisions.length > history.length) {
                setHasUnread(true);
            }

            setHistory(decisions);
        } catch (err) {
            console.error('[SupervisorWidget] Failed to fetch decisions:', err);
        }
    };

    useEffect(() => {
        if (!userId) return;

        // Initial fetch
        fetchDecisions();

        // Poll every 30 seconds for new decisions
        const intervalId = setInterval(fetchDecisions, 30000);

        return () => clearInterval(intervalId);
    }, [userId]);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) setHasUnread(false);
    };

    const getConfidenceColor = (score: number) => {
        if (score >= 90) return 'text-emerald-500';
        if (score >= 70) return 'text-blue-500';
        if (score >= 50) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end pointer-events-none">
            
            {/* Popover Panel */}
            {isOpen && (
                <div className="mb-4 w-96 bg-white border-2 border-ink shadow-hard-lg pointer-events-auto animate-slide-up origin-bottom-right flex flex-col max-h-[600px]">
                    <div className="bg-ink text-white p-3 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <BrainCircuit size={18} className="text-accent"/>
                            <span className="font-bold text-xs uppercase tracking-widest">Global Workspace</span>
                        </div>
                        <button onClick={toggleOpen}><X size={14}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dot-pattern">
                        {history.length === 0 ? (
                            <div className="text-center text-gray-400 text-xs italic py-4">
                                Monitoring cognitive stream...
                            </div>
                        ) : (
                            history.map(decision => (
                                <div key={decision.id} className="bg-white border-2 border-gray-100 p-3 shadow-sm text-xs rounded-sm relative overflow-hidden">
                                    {/* Confidence Stripe */}
                                    <div className={`absolute top-0 left-0 bottom-0 w-1 ${decision.type === 'inhibit' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                    
                                    <div className="pl-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {decision.type === 'inhibit' && <Shield size={12} className="text-red-500"/>}
                                                {decision.type === 'allow' && <Check size={12} className="text-emerald-500"/>}
                                                {decision.type === 'request_guidance' && <Lightbulb size={12} className="text-yellow-500"/>}
                                                <span className="font-bold uppercase text-[10px] text-gray-600">{decision.type}</span>
                                            </div>
                                            <span className={`font-mono font-bold text-[10px] ${getConfidenceColor(decision.confidenceScore)}`}>
                                                {decision.confidenceScore}% Conf.
                                            </span>
                                        </div>

                                        {/* User Message */}
                                        <p className="text-ink font-medium mb-2 leading-relaxed">
                                            "{decision.userMessage}"
                                        </p>

                                        {/* Meta-Cognition (Hidden Thinking) */}
                                        {(decision.simulationResult || decision.reasoning) && (
                                            <div className="bg-gray-50 p-2 rounded-sm border border-gray-200 mt-2 space-y-1">
                                                {decision.simulationResult && (
                                                    <div className="flex gap-2">
                                                        <Play size={10} className="text-purple-500 shrink-0 mt-0.5"/>
                                                        <span className="text-[10px] text-gray-500 italic">
                                                            Sim: {decision.simulationResult}
                                                        </span>
                                                    </div>
                                                )}
                                                {decision.reasoning && (
                                                    <div className="flex gap-2">
                                                        <Activity size={10} className="text-blue-500 shrink-0 mt-0.5"/>
                                                        <span className="text-[10px] text-gray-500">
                                                            Reasoning: {decision.reasoning}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Policy Update Badge */}
                                        {decision.policyUpdate && (
                                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-sm">
                                                <Shield size={10}/>
                                                <span className="text-[9px] font-bold uppercase">New Policy Learned</span>
                                            </div>
                                        )}

                                        <div className="mt-2 flex justify-between items-center">
                                            <span className="text-[9px] text-gray-400 font-mono">{new Date(decision.timestamp).toLocaleTimeString()}</span>
                                            <span className="text-[9px] text-gray-400 bg-gray-50 px-1 rounded border border-gray-100">
                                                Goal: {decision.relevantGoal}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <div className="p-2 bg-gray-50 border-t border-gray-200 text-center shrink-0">
                        <div className="text-[10px] text-gray-400 font-mono">
                            {history.length} decision{history.length !== 1 ? 's' : ''} • Auto-monitoring active
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button 
                onClick={toggleOpen}
                className={`
                    w-14 h-14 bg-ink border-2 border-white shadow-hard rounded-full flex items-center justify-center text-white pointer-events-auto transition-transform hover:scale-110 active:scale-95 group relative
                    ${hasUnread ? 'animate-bounce' : ''}
                `}
            >
                <Eye size={24} className="group-hover:text-accent transition-colors"/>
                {hasUnread && <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>}
            </button>
        </div>
    );
};
