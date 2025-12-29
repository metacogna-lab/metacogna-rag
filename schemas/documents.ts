
export interface Vault {
  id: string;
  name: string;
  type: 'local' | 's3' | 'proton' | 'gcs' | 'google_drive';
  path: string;
  status: 'connected' | 'disconnected' | 'error';
  config?: Record<string, string>; // For OAuth, Keys, etc.
  icon?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Document {
  id: string;
  vaultId?: string; // Link to specific vault
  title: string;
  type: 'pdf' | 'md' | 'txt';
  size: string;
  uploadDate: string;
  status: 'processing' | 'indexed' | 'error';
  chunkCount: number;
  progress?: number; // 0-100
  metadata?: Record<string, string>; 
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  tokenCount: number;
  embedding?: number[]; // Vector representation
  chunkIndex: number;
  metadata?: Record<string, any>;
}
