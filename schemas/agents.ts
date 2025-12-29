

export type AgentGoalType = 'synthesis' | 'creation' | 'summarisation' | 'questioning';

export interface AgentGoal {
  id: string;
  type: AgentGoalType;
  label: string;
  description: string;
  systemPrompt: string;
}

export interface IdeaUnit {
  id: string;
  content: string;
  strength?: number;
  type: 'concept' | 'constraint' | 'data' | 'insight' | 'component';
}

export interface Idea extends IdeaUnit {
  x: number;
  y: number;
  shape: 'circle' | 'square' | 'triangle' | 'hexagon';
  color: string;
  scale: number;
}

// Alias for backward compatibility if needed, but we will primarily use Idea
export type KnowledgeBlock = Idea;

export interface AgentAction {
  type: 'MERGE' | 'EXPLODE' | 'SHAKE' | 'READ_STREAM' | 'IDLE';
  targetBlockIds: string[];
  description: string;
}

export interface AgentTurn {
  step: number;
  agentName: 'Coordinator' | 'Critic';
  thought: string;
  action: AgentAction;
  outputContent: string; // Markdown or JSON string content
}

// --- RECURSIVE KNOWLEDGE TREE ---
export interface RecursiveNode {
  id: string;
  label: string;
  summary: string;
  children: RecursiveNode[];
  isExpanded: boolean;
  depth: number;
  type: 'root' | 'branch' | 'leaf';
}