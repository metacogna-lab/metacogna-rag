
import { Vault } from './documents';
import { SystemPrompt } from './prompts';

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'ollama';

export type LLMModelID = 
  | 'gpt-5'
  | 'gpt-5-mini'
  | 'gpt-4o' 
  | 'gpt-4o-mini' 
  | 'o1-preview'
  | 'claude-3-5-sonnet-latest' 
  | 'claude-3-haiku-20240307'
  | 'gemini-3-flash-preview'
  | 'gemini-3-pro-preview'
  | 'llama3.2'
  | 'mistral-nemo'
  | string; // Allow dynamic strings for Ollama or custom models

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
