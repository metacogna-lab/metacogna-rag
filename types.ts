
// Re-export all schemas for backward compatibility
export * from './schemas/documents';
export * from './schemas/chat';
export * from './schemas/agents';
export * from './schemas/prompts';
export * from './schemas/settings';

// Visual / UI specific types that don't belong in DB schemas can remain or be imported
export enum ViewState {
  LANDING = 'LANDING',
  UPLOAD = 'UPLOAD',
  QUESTION = 'QUESTION',
  GRAPH = 'GRAPH',
  PROMPT = 'PROMPT',
  PRODUCT_X = 'PRODUCT_X',
  MY_PROFILE = 'MY_PROFILE',
  SETTINGS = 'SETTINGS',
  AGENT_CANVAS = 'AGENT_CANVAS',
  CONSOLE = 'CONSOLE',
  SIGNUP = 'SIGNUP'
}

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  val: number; // size
}

export interface GraphLink {
  source: string;
  target: string;
  relation: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export type ProfileSummaryMode = 'raw' | 'professional' | 'future' | 'product';

// --- Fine-Tuning Data Schema ---
export interface TrainingExample {
  id: string;
  timestamp: number;
  source: 'rag_chat' | 'agent_simulation' | 'prompt_lab';
  model_used: string;
  input: {
    system?: string;
    user: string;
    context?: string; // Retrieved chunks or agent history
  };
  output: string; // The model's response
  metadata?: Record<string, any>;
}

// --- System Logs ---
export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'agent' | 'system' | 'app' | 'security' | 'supervisor';
  source: string;
  message: string;
  details?: any;
}

// --- Memory System ---
export type MemoryTier = 'short' | 'medium' | 'long';

export interface MemoryFrame {
  id: string;
  streamId: string;
  timestamp: number;
  agentName: string;
  input: string;
  thought: string;
  action: string;
  output: string;
  tags: string[];
}

export interface StreamContext {
  streamId: string;
  startedAt: number;
  goal: string;
  status: 'active' | 'archived';
  frames: MemoryFrame[];
}

// --- Session Analysis ---
export interface AnalyzedSession {
  id: string;
  timestamp: number;
  streamId: string;
  type: 'chat' | 'agent';
  summary: string;
  extractedSchema?: string;
  datasetPreview: TrainingExample[];
  fullLog: string;
}

// --- Authentication ---
export interface User {
  id: string; // UUID
  username: string;
  email?: string;
  name?: string;
  passwordHash: string;
  goals?: string;
  isAdmin?: number; // 0 or 1 (SQLite boolean)
  createdAt: number;
  lastLogin: number;
  preferences?: {
    theme?: 'light' | 'dark';
  };
}

// --- Supervisor Meta-Cognition ---

export interface MetaPolicy {
  id: string;
  rule: string; // e.g. "User prefers academic citation over brevity"
  createdContext: string;
  weight: number;
}

export interface SupervisorDecision {
  id: string;
  timestamp: number;
  type: 'inhibit' | 'allow' | 'request_guidance';
  confidenceScore: number; // 0-100
  simulationResult: string; // "Worst case: x happens"
  reasoning: string;
  policyUpdate?: string; // New rule learned
  userMessage?: string; // What is actually shown to user
  relevantGoal?: string;
  displayMode?: 'widget' | 'toast';
  actionLabel?: string;
  actionLink?: ViewState;
}

export type SupervisorAdvice = SupervisorDecision; // Alias for compatibility
