import Rosemary = require('./index');

declare class RosemaryLLM extends Rosemary {
  constructor(config?: {
    dataFile?: string;
    autoSave?: boolean;
    embedder?: (text: string) => number[] | Float32Array | Promise<number[] | Float32Array>;
    claudeProvider?: { complete(prompt: string): Promise<object> };
    provider?: string;
  });

  embeddings: Map<string, Float32Array>;
  addEnhancedLeaf(content: string, tags?: string[], metadata?: Record<string, unknown>): Promise<string>;
  generateEmbedding(text: string): Promise<Float32Array>;
  cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number;
  semanticSearch(query: string, options?: { topK?: number; threshold?: number }): Promise<Array<{ leaf: unknown; score: number }>>;
  rebuildMissingEmbeddings(): Promise<Map<string, Float32Array> | void>;
  rebuildEmbeddings(): Promise<Map<string, Float32Array>>;
  buildPromptContext(leafId: string, options?: {
    depth?: number;
    maxTokens?: number;
    includeRelationships?: boolean;
    includeTags?: boolean;
    responseFormat?: 'concise' | 'detailed';
  }): object;
  pruneToTokenLimit(context: object, maxTokens: number): object;
  estimateTokens(obj: object): number;
  generateStructuredPrompt(context: object, userQuery: string): string;
  complete(query: string, leafId?: string | null, options?: object): Promise<object>;
  resolve(input: string, options?: { limit?: number; threshold?: number; semanticThreshold?: number }): Promise<unknown>;
}

export = RosemaryLLM;
