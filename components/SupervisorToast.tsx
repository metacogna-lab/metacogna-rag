import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Shield, Lightbulb } from 'lucide-react';
import { SupervisorDecision } from '../types';
import { useAppStore, selectAuth } from '../store';

export const SupervisorToast: React.FC = () => {
    const { userId } = useAppStore(selectAuth);
    const [toasts, setToasts] = useState<SupervisorDecision[]>([]);
    const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);

    // Fetch urgent decisions (displayMode: 'toast', confidence < 70%)
    const fetchUrgentDecisions = async () => {
        if (!userId) return;

        try {
            const response = await fetch(`/api/supervisor/decisions?userId=${userId}`);
            if (!response.ok) return;

            const data = await response.json();
            const decisions = (data.decisions || []) as SupervisorDecision[];

            // Filter for toast-mode decisions that haven't been dismissed
            const urgentDecisions = decisions.filter(
                (d: any) => d.displayMode === 'toast' && !d.dismissedAt
            );

            // Only show new toasts (not previously fetched)
            const newToasts = urgentDecisions.filter(
                (d: any) => !lastFetchedId || d.timestamp > parseInt(lastFetchedId)
            );

            if (newToasts.length > 0) {
                setToasts((prev) => [...newToasts.slice(0, 3), ...prev].slice(0, 3)); // Max 3 toasts
                setLastFetchedId(newToasts[0].id);
            }
        } catch (err) {
            console.error('[SupervisorToast] Failed to fetch decisions:', err);
        }
    };

    useEffect(() => {
        if (!userId) return;

        // Initial fetch
        fetchUrgentDecisions();

        // Poll every 60 seconds for urgent decisions
        const intervalId = setInterval(fetchUrgentDecisions, 60000);

        return () => clearInterval(intervalId);
    }, [userId]);

    const dismissToast = async (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));

        // Mark as dismissed in the database
        try {
            await fetch('/api/supervisor/decisions/dismiss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decisionId: id, dismissedAt: Date.now() })
            });
        } catch (err) {
            console.error('[SupervisorToast] Failed to dismiss:', err);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'inhibit':
                return <Shield size={16} className="text-red-500" />;
            case 'request_guidance':
                return <Lightbulb size={16} className="text-yellow-500" />;
            default:
                return <AlertTriangle size={16} className="text-orange-500" />;
        }
    };

    const getBorderColor = (type: string) => {
        switch (type) {
            case 'inhibit':
                return 'border-red-500';
            case 'request_guidance':
                return 'border-yellow-500';
            default:
                return 'border-orange-500';
        }
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-20 right-6 z-[70] flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast, index) => (
                <div
                    key={toast.id}
                    className={`
                        w-96 bg-white border-2 ${getBorderColor(toast.type)} shadow-hard-lg pointer-events-auto
                        animate-slide-in-right
                    `}
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-start gap-2">
                                {getIcon(toast.type)}
                                <div className="flex-1">
                                    <div className="font-bold text-xs uppercase text-gray-600 mb-1">
                                        Supervisor Alert • {toast.confidenceScore}% Confidence
                                    </div>
                                    <p className="text-sm text-ink font-medium leading-relaxed">
                                        {toast.userMessage}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => dismissToast(toast.id)}
                                className="shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                                <X size={14} className="text-gray-400" />
                            </button>
                        </div>

                        {toast.reasoning && (
                            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-sm text-xs text-gray-600">
                                <span className="font-bold">Reasoning:</span> {toast.reasoning}
                            </div>
                        )}

                        {toast.actionLabel && toast.actionLink && (
                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={() => {
                                        window.location.hash = toast.actionLink || '';
                                        dismissToast(toast.id);
                                    }}
                                    className="flex-1 px-3 py-2 bg-ink text-white text-xs font-bold uppercase hover:bg-accent transition-colors"
                                >
                                    {toast.actionLabel}
                                </button>
                                <button
                                    onClick={() => dismissToast(toast.id)}
                                    className="px-3 py-2 border-2 border-gray-200 text-xs font-bold uppercase hover:border-gray-400 transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        <div className="mt-2 text-[9px] text-gray-400 font-mono">
                            {new Date(toast.timestamp).toLocaleString()}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
