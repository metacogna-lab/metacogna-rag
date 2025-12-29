
export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface ChatMessage {
  id: string;
  sessionId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sources?: Source[];
}

export interface Source {
  id: string;
  documentTitle: string;
  snippet: string;
  score: number;
  page?: number;
  metadata?: Record<string, any>;
}
