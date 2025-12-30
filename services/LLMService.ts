
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppConfig, LLMProvider, LLMModelID } from "../types";

export interface LLMRequestOptions {
    temperature?: number;
    maxTokens?: number;
    jsonSchema?: any; // For structured output
    systemInstruction?: string;
}

// Retry logic helper
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (err: any) {
        // Check for non-retriable errors (like 401 Unauthorized which implies bad key)
        const errStr = JSON.stringify(err);
        if (errStr.includes("401") || errStr.includes("INVALID_ARGUMENT")) {
            throw err;
        }

        if (retries > 0) {
            console.warn(`[LLMService] Retrying... attempts left: ${retries}. Error: ${err.message}`);
            await new Promise(r => setTimeout(r, delay));
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw err;
    }
}

export class LLMService {
    
    // Helper to get the right API key, ensuring no whitespace
    private getKey(config: AppConfig['llm']): string {
        switch (config.provider) {
            case 'google': return (config.apiKeys.google || process.env.API_KEY || '').trim();
            case 'openai': return (config.apiKeys.openai || '').trim();
            case 'anthropic': return (config.apiKeys.anthropic || '').trim();
            default: return '';
        }
    }

    async generate(
        config: AppConfig['llm'],
        prompt: string, 
        options: LLMRequestOptions = {}
    ): Promise<string> {
        return withRetry(async () => {
            const { provider, model, ollamaUrl } = config;
            const apiKey = this.getKey(config);

            try {
                switch (provider) {
                    case 'google': {
                        if (!apiKey) {
                            throw new Error("Google API Key is missing. Please check your settings.");
                        }

                        const ai = new GoogleGenerativeAI({ apiKey });
                        
                        // Construct config dynamically
                        const genConfig: any = {};
                        if (options.temperature !== undefined) genConfig.temperature = options.temperature;
                        if (options.maxTokens !== undefined) genConfig.maxOutputTokens = options.maxTokens;
                        if (options.systemInstruction) genConfig.systemInstruction = options.systemInstruction;
                        
                        if (options.jsonSchema) {
                            genConfig.responseMimeType = "application/json";
                            genConfig.responseSchema = options.jsonSchema;
                        }

                        const contentPayload = [{ role: 'user', parts: [{ text: prompt }] }];

                        const response = await ai.models.generateContent({
                            model: model,
                            contents: contentPayload,
                            config: genConfig
                        });
                        
                        return response.text || "";
                    }

                    case 'openai': {
                        if (!apiKey) throw new Error("OpenAI API Key is missing.");
                        
                        const payload: any = {
                            model: model,
                            messages: [
                                { role: "system", content: options.systemInstruction || "You are a helpful assistant." },
                                { role: "user", content: prompt }
                            ],
                            temperature: options.temperature,
                            max_tokens: options.maxTokens,
                        };
                        if (options.jsonSchema) {
                            payload.response_format = { type: "json_object" };
                        }

                        const res = await fetch("https://api.openai.com/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${apiKey}`
                            },
                            body: JSON.stringify(payload)
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error?.message || "OpenAI Error");
                        return data.choices?.[0]?.message?.content || "";
                    }

                    case 'anthropic': {
                        if (!apiKey) throw new Error("Anthropic API Key is missing.");

                        const res = await fetch("https://api.anthropic.com/v1/messages", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "x-api-key": apiKey,
                                "anthropic-version": "2023-06-01",
                                "anthropic-dangerous-direct-browser-access": "true" 
                            },
                            body: JSON.stringify({
                                model: model,
                                system: options.systemInstruction,
                                messages: [{ role: "user", content: prompt }],
                                max_tokens: options.maxTokens || 1024,
                                temperature: options.temperature
                            })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error?.message || "Anthropic Error");
                        return data.content?.[0]?.text || "";
                    }

                    case 'ollama': {
                        const url = ollamaUrl || 'http://localhost:11434';
                        const fullPrompt = options.systemInstruction 
                            ? `${options.systemInstruction}\n\n${prompt}` 
                            : prompt;
                        
                        const res = await fetch(`${url}/api/generate`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                model: model,
                                prompt: fullPrompt,
                                stream: false,
                                format: options.jsonSchema ? "json" : undefined,
                                options: {
                                    temperature: options.temperature,
                                    num_predict: options.maxTokens
                                }
                            })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error("Ollama Error");
                        return data.response || "";
                    }

                    default:
                        throw new Error(`Provider ${provider} not supported.`);
                }
            } catch (error: any) {
                // Enhanced error parsing
                console.error(`[LLMService] Generation Failed (${provider}):`, error);
                
                const errorStr = JSON.stringify(error) || error.message || "";
                
                // Google GenAI Specific Error Handling
                if (errorStr.includes("Rpc failed") || errorStr.includes("error code: 6") || errorStr.includes("XHR error")) {
                    throw new Error("Network Blocked (Code 6). Check your Firewall, VPN, or Browser Extensions (AdBlock/Privacy Badger).");
                }
                if (errorStr.includes("API key not valid") || errorStr.includes("403")) {
                    throw new Error("Invalid API Key. Please update it in Settings.");
                }
                if (errorStr.includes("quota") || errorStr.includes("429")) {
                    throw new Error("Rate Limit Exceeded. Please try again later.");
                }
                
                throw error;
            }
        });
    }

    async embed(config: AppConfig['llm'], text: string): Promise<number[]> {
        return withRetry(async () => {
            const { provider, ollamaUrl } = config;
            const apiKey = this.getKey(config);

            try {
                if (provider === 'google') {
                    if (!apiKey) throw new Error("Google API Key is missing for embedding.");
                    
                    const ai = new GoogleGenAI({ apiKey });
                    const res = await ai.models.embedContent({
                        model: "text-embedding-004",
                        contents: [{ parts: [{ text }] }]
                    });
                    return res.embeddings?.[0]?.values || [];
                }
                
                if (provider === 'openai') {
                    if (!apiKey) throw new Error("OpenAI API Key is missing for embedding.");

                    const res = await fetch("https://api.openai.com/v1/embeddings", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: "text-embedding-3-small",
                            input: text
                        })
                    });
                    const data = await res.json();
                    return data.data?.[0]?.embedding || [];
                }

                if (provider === 'ollama') {
                    const url = ollamaUrl || 'http://localhost:11434';
                    const res = await fetch(`${url}/api/embeddings`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: config.model,
                            prompt: text
                        })
                    });
                    const data = await res.json();
                    return data.embedding || [];
                }

                // Fallback
                return new Array(768).fill(0).map(() => Math.random());

            } catch (e: any) {
                console.warn("Embedding failed, using fallback:", e.message);
                return new Array(768).fill(0).map(() => Math.random());
            }
        });
    }
}

export const llmService = new LLMService();
