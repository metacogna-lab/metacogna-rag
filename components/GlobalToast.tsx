
import React, { useState, useEffect } from 'react';
import { SupervisorAdvice, ViewState } from '../types';
import { supervisorService } from '../services/SupervisorService';
import { X, MessageSquare, ArrowRight } from 'lucide-react';

export const GlobalToast: React.FC<{ setView: (view: ViewState) => void }> = ({ setView }) => {
    const [toast, setToast] = useState<SupervisorAdvice | null>(null);

    useEffect(() => {
        const unsub = supervisorService.subscribe((history) => {
            const latest = history[0];
            // Only show if it is a 'toast' type and recent (within last 5 seconds to avoid old spam on reload)
            if (latest && latest.displayMode === 'toast' && (Date.now() - latest.timestamp < 5000)) {
                setToast(latest);
                // Auto dismiss after 10s
                setTimeout(() => setToast(null), 10000);
            }
        });
        return () => unsub();
    }, []);

    if (!toast) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
            <div className="bg-ink text-white p-4 rounded-sm shadow-hard-lg border-2 border-white flex items-start gap-4 max-w-md">
                <div className="p-2 bg-white/10 rounded-full shrink-0">
                    <MessageSquare size={20} className="text-accent"/>
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-sm text-accent uppercase tracking-wider mb-1">Supervisor Insight</h4>
                    <p className="text-sm font-sans leading-snug mb-3">{toast.userMessage}</p>
                    
                    {toast.actionLabel && toast.actionLink && (
                        <button 
                            onClick={() => {
                                setView(toast.actionLink!);
                                setToast(null);
                            }}
                            className="text-xs font-bold uppercase flex items-center gap-1 hover:text-accent transition-colors"
                        >
                            {toast.actionLabel} <ArrowRight size={12}/>
                        </button>
                    )}
                </div>
                <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white">
                    <X size={14}/>
                </button>
            </div>
        </div>
    );
};
