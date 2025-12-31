
import { Vault } from './documents';
import { SystemPrompt } from './prompts';

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'ollama' | 'workers';

export type LLMModelID =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'o1-preview'
  | 'o1-mini'
  | 'gpt-4-turbo'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-haiku-20241022'
  | 'claude-3-opus-20240229'
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-flash-8b'
  | 'llama3.2'
  | 'mistral-nemo'
  | '@cf/meta/llama-3-8b-instruct'
  | '@cf/meta/llama-3.1-8b-instruct'
  | string; // Allow dynamic strings for Ollama, Workers AI, or custom models

export interface AppConfig {
  userName: string;
  userGoals: string;
  userDreams?: string; // New field for abstract aspirations
  activeVaultId: string;
  vaults: Vault[];
  systemPrompts: SystemPrompt[];
  activeSystemPromptId?: string;
  llm: {
    provider: LLMProvider;
    model: LLMModelID;
    apiKeys: {
      openai?: string;
      anthropic?: string;
      google?: string;
      ollama?: string;
      workers?: string;
    };
    ollamaUrl?: string;
    temperature: number;
  };
}

export interface AnalyticsEvent {
  id: string;
  type: 'search' | 'generation' | 'indexing';
  latencyMs: number;
  tokenCount: number;
  timestamp: number;
  success: boolean;
  details?: Record<string, any>;
}
