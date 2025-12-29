
export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  category: 'analysis' | 'profile' | 'creative' | 'technical';
  lastModified: number;
}

export interface SavedPrompt {
  id: string;
  content: string;
  timestamp: number;
  mode: 'precise' | 'creative';
  preview: string;
  tags?: string[];
}
