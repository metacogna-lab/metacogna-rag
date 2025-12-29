import { Langfuse, LangfuseTraceClient, LangfuseSpanClient } from 'langfuse';

export interface TraceContext {
    userId: string;
    sessionId: string;
    userLevel?: 'Novice' | 'Pro' | 'Expert';
}

export type TraceName = 
    | 'debate-round-analysis' 
    | 'video-coach-feedback' 
    | 'topic-search'
    | 'auth-register'
    | 'auth-login';

export type SpanName = 
    | 'retrieval-step' 
    | 'llm-reasoning' 
    | 'synthesis-output' 
    | 'transcription-process' 
    | 'vision-analysis' 
    | 'web-search-execution' 
    | 'results-ranking';

class ObservabilityService {
    private langfuse: Langfuse | null = null;
    private isEnabled: boolean = false;

    constructor() {
        this.init();
    }

    private init() {
        const publicKey = process.env.LANGFUSE_PUBLIC_KEY || (typeof process !== 'undefined' ? (window as any).ENV?.LANGFUSE_PUBLIC_KEY : undefined);
        const secretKey = process.env.LANGFUSE_SECRET_KEY || (typeof process !== 'undefined' ? (window as any).ENV?.LANGFUSE_SECRET_KEY : undefined);
        const host = process.env.LANGFUSE_HOST || 'http://localhost:3000';

        if (publicKey && secretKey) {
            this.langfuse = new Langfuse({
                publicKey,
                secretKey,
                baseUrl: host,
                // Ensure events are flushed before page unload or worker term
                flushAt: 10, 
                flushInterval: 1000
            });
            this.isEnabled = true;
            console.log(`[Observability] Initialized with host: ${host}`);
        } else {
            console.warn('[Observability] Missing keys. Tracing disabled.');
        }
    }

    /**
     * Masks PII from logs before sending to Langfuse.
     * Basic implementation: Masks email-like patterns.
     */
    private maskPII(input: any): any {
        if (!input) return input;
        const str = JSON.stringify(input);
        // Regex to find emails and replace with [EMAIL]
        const masked = str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
        return JSON.parse(masked);
    }

    /**
     * Core Wrapper: traceDebateAction
     * Wraps a business function in a Langfuse Trace.
     */
    async traceDebateAction<T>(
        traceName: TraceName,
        context: TraceContext,
        actionFn: (trace: LangfuseTraceClient) => Promise<T>,
        metadata?: Record<string, any>
    ): Promise<T> {
        if (!this.isEnabled || !this.langfuse) {
            // Passthrough if disabled
            return actionFn({ 
                span: () => ({ end: () => {}, update: () => {} } as any),
                update: () => {},
                score: () => {},
                event: () => {}
            } as unknown as LangfuseTraceClient);
        }

        const trace = this.langfuse.trace({
            name: traceName,
            userId: context.userId,
            sessionId: context.sessionId,
            tags: [context.userLevel || 'Novice'],
            metadata: this.maskPII(metadata),
        });

        try {
            const result = await actionFn(trace);
            
            // Optional: Update output if not stream
            if (typeof result === 'string' || typeof result === 'object') {
                trace.update({ output: this.maskPII(result) });
            }
            
            return result;
        } catch (error: any) {
            trace.update({ 
                output: `ERROR: ${error.message}`,
                level: 'ERROR' 
            });
            throw error;
        } finally {
            // In serverless/edge, we might need to flush manually here if not using lifecycle events
            // but flushAsync is usually called at the worker level.
        }
    }

    /**
     * Helper to measure a specific span operation.
     */
    async measureSpan<T>(
        trace: LangfuseTraceClient,
        name: SpanName,
        fn: () => Promise<T>,
        input?: any
    ): Promise<T> {
        const span = trace.span({ 
            name,
            input: this.maskPII(input)
        });

        const startTime = Date.now();
        try {
            const result = await fn();
            span.end({ 
                output: this.maskPII(result),
                endTime: new Date()
            });
            return result;
        } catch (e: any) {
            span.end({
                level: 'ERROR',
                statusMessage: e.message,
                endTime: new Date()
            });
            throw e;
        }
    }

    /**
     * Submit user feedback score
     */
    async submitScore(traceId: string, name: string, value: number, comment?: string) {
        if (!this.isEnabled || !this.langfuse) return;
        
        await this.langfuse.score({
            traceId,
            name,
            value,
            comment
        });
    }

    /**
     * CRITICAL: Call this before Cloudflare Worker terminates
     */
    async flushAsync() {
        if (this.langfuse) {
            await this.langfuse.flushAsync();
        }
    }
}

export const observability = new ObservabilityService();