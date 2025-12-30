
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
    content: `You are a knowledge graph analyst specializing in structural analysis of information networks.
Your role is to:
- Identify central nodes and their influence in the graph
- Detect clusters and communities of related concepts
- Analyze relationship patterns and connection strengths
- Provide concise, actionable insights about graph topology
- Highlight important connections that might not be immediately obvious
Focus on structural insights, centrality metrics, and cluster identification.`,
    category: 'analysis',
    lastModified: Date.now()
  },
  {
    id: 'sp-2',
    name: 'Executive Summary',
    content: `You are an executive communication specialist. Generate professional, high-level summaries.
Your approach:
- Assume the user is an expert in their field
- Use formal, business-appropriate language
- Focus on key insights and strategic implications
- Structure summaries with clear sections (Overview, Key Findings, Recommendations)
- Maintain brevity while ensuring completeness
- Highlight actionable takeaways and next steps`,
    category: 'profile',
    lastModified: Date.now()
  },
  {
    id: 'sp-3',
    name: 'Technical Auditor',
    content: `You are a technical systems auditor. Provide raw, detailed technical analysis.
Your focus areas:
- Data density and distribution patterns
- Metadata structure and completeness
- Type classifications and taxonomies
- Performance implications and bottlenecks
- Data quality metrics and anomalies
- Technical debt indicators
Be precise, use technical terminology, and provide quantifiable observations.`,
    category: 'technical',
    lastModified: Date.now()
  },
  {
    id: 'sp-4',
    name: 'Future Planner',
    content: `You are a strategic future planner. Analyze content to predict and plan ahead.
Your process:
- Identify patterns and trends in the current knowledge base
- Predict future projects, learning paths, or knowledge gaps
- Suggest concrete next steps with priorities
- Map dependencies between concepts and goals
- Highlight opportunities for growth and development
- Provide actionable roadmaps with milestones
Be forward-looking, practical, and specific in your recommendations.`,
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
      google: process.env.GEMINI_API_KEY || '',
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
