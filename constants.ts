
import { Document, GraphData, ChatMessage, AppConfig, Vault, SystemPrompt } from './types';

export const HERO_IMAGE_URL = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop";

export const DEFAULT_VAULTS: Vault[] = [
  {
    id: 'v1',
    name: 'Local Vault',
    type: 'local',
    path: './data',
    status: 'connected'
  }
];

export const DEFAULT_SYSTEM_PROMPTS: SystemPrompt[] = [
  {
    id: 'sp-1',
    name: 'Graph Analyst',
    content: 'You are a knowledge graph analyst. Provide concise, structural insights focusing on centrality and clusters.',
    category: 'analysis',
    lastModified: Date.now()
  },
  {
    id: 'sp-2',
    name: 'Executive Summary',
    content: 'Generate a professional profile summary based on the topics found. Assume the user is an expert. Use formal language.',
    category: 'profile',
    lastModified: Date.now()
  },
  {
    id: 'sp-3',
    name: 'Technical Auditor',
    content: 'Provide a raw, technical analysis of the document set, focusing on data density, types, and metadata distribution.',
    category: 'technical',
    lastModified: Date.now()
  },
  {
    id: 'sp-4',
    name: 'Future Planner',
    content: 'Analyze the content to predict future projects, learning paths, or gaps in knowledge. Suggest next steps.',
    category: 'creative',
    lastModified: Date.now()
  }
];

export const PROVIDER_DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  google: 'gemini-3-flash-preview',
  anthropic: 'claude-3-haiku-20240307',
  ollama: 'llama3.2'
};

export const AVAILABLE_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'o1-preview', name: 'o1 Preview' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini (Preview)' }
  ],
  google: [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
    { id: 'gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash' }
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
  ]
};

export const DEFAULT_CONFIG: AppConfig = {
  userName: 'User',
  userGoals: '',
  userDreams: '',
  activeVaultId: 'v1',
  vaults: DEFAULT_VAULTS,
  systemPrompts: DEFAULT_SYSTEM_PROMPTS,
  activeSystemPromptId: 'sp-1',
  llm: {
    provider: 'google',
    model: 'gemini-3-flash-preview',
    apiKeys: {
      google: process.env.API_KEY || '',
      openai: '',
      anthropic: '',
      ollama: ''
    },
    temperature: 0.3
  }
};

// --- Empty Initial State for Production ---

export const MOCK_DOCUMENTS: Document[] = [];

export const MOCK_KNOWLEDGE_BASE: { docId: string; content: string; metadata: Record<string, any> }[] = [];

export const MOCK_GRAPH_DATA: GraphData = {
  nodes: [],
  links: []
};

export const MOCK_CHAT_HISTORY: ChatMessage[] = [];

export const WORD_CLOUD_DATA = [];
