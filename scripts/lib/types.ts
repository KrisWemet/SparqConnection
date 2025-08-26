// scripts/lib/types.ts
export interface DocumentChunk {
  content: string;
  contentType: 'docs' | 'schema' | 'design';
  filePath: string;
  sectionTitle?: string;
  chunkIndex: number;
  tokenCount: number;
  embedding?: number[];
  agentRelevance: Record<string, number>;
  metadata: Record<string, any>;
}

export interface EmbeddingResult {
  id: string;
  chunk: DocumentChunk;
  similarity?: number;
  relevanceScore?: number;
}

export interface AgentRelevanceConfig {
  agentType: string;
  keywords: string[];
  contentPreferences: string[];
  excludePatterns: string[];
  minRelevanceThreshold: number;
}

export interface ProcessingStats {
  totalFiles: number;
  totalChunks: number;
  processingTime: number;
  embeddingCost: number;
  errors: string[];
}

export interface RetrievalQuery {
  query: string;
  agentType?: string;
  limit?: number;
  minRelevance?: number;
  contentTypes?: ('docs' | 'schema' | 'design')[];
  filePaths?: string[];
}

export interface RetrievalResult {
  chunks: EmbeddingResult[];
  totalResults: number;
  processingTime: number;
  agentRelevanceApplied: boolean;
}