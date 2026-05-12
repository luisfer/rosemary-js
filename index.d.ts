declare namespace Rosemary {
export interface LeafJSON {
  id: string;
  content: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: number;
  lastModified: number;
}

export interface Leaf {
  id: string;
  content: string;
  tags: Set<string>;
  metadata: Record<string, unknown>;
  createdAt: number;
  lastModified: number;
  addTag(tag: string): void;
  removeTag(tag: string): boolean;
  hasTag(tag: string): boolean;
  updateContent(content: string): void;
  updateMetadata(metadata?: Record<string, unknown>): void;
  toJSON(): LeafJSON;
}

export interface ConnectionJSON {
  from: string;
  to: string;
  type: string;
  directed: boolean;
}

export interface RosemaryOptions {
  dataFile?: string;
  autoSave?: boolean;
}

export interface ResolveCandidate {
  type: 'leaf' | 'tag';
  id?: string;
  name?: string;
  leaf?: Leaf;
  score: number;
  reasons: string[];
}

export interface ResolveResult {
  canonical: ResolveCandidate | null;
  candidates: ResolveCandidate[];
  confidence: number;
}

export interface BridgeResult {
  path: Leaf[];
  relationships: Array<{ from: string; to: string; type: string }>;
  distance: number;
}

export interface InferenceResult {
  leaf: Leaf;
  relationship: string;
  distance: number;
  path: string[];
}
}

declare class Rosemary {
  static SCHEMA_VERSION: number;
  static RESERVED_EDGE_TYPES: Record<string, string>;

  constructor(options?: Rosemary.RosemaryOptions);
  dataFile: string;
  leaves: Map<string, Rosemary.Leaf>;
  tags: Set<string>;
  autoSave: boolean;

  loadData(dataFile?: string): void;
  saveData(): void;
  addLeaf(content: string, tags?: string[], metadata?: Record<string, unknown>): string;
  getLeafById(id: string): Rosemary.Leaf;
  getAllLeaves(): Rosemary.Leaf[];
  removeLeaf(id: string): void;
  deleteLeaf(id: string): boolean;
  updateLeaf(id: string, updates?: { content?: string; tags?: string[]; metadata?: Record<string, unknown> }): Rosemary.Leaf;
  tagLeaf(leafId: string, ...tags: string[]): void;
  getAllTags(): Array<{ name: string; count: number; leaves: Array<{ id: string; content: string }> }>;
  getLeavesByTag(tag: string): Rosemary.Leaf[];
  getMostUsedTags(limit?: number): Array<{ name: string; count: number }>;
  suggestTags(partialTag: string, limit?: number): string[];
  connectLeaves(leafId1: string, leafId2: string, relationshipType?: string): void;
  connectDirectedLeaves(fromLeafId: string, toLeafId: string, relationshipType?: string): void;
  getLeavesByConnection(leafId: string): Rosemary.Leaf[];
  getRelatedLeaves(leafId: string, maxDistance?: number): Rosemary.Leaf[];
  infer(leafId: string, relationshipType?: string): Rosemary.InferenceResult[];
  walk(startLeafId?: string | null, maxLength?: number, mode?: string): Rosemary.Leaf[];
  bridge(fromLeafId: string, toLeafId: string): Rosemary.BridgeResult | null;
  resolve(input: string, options?: { limit?: number; threshold?: number }): Rosemary.ResolveResult;
  getLeavesByContent(searchString: string): Rosemary.Leaf[];
  fuzzySearch(query: string, options?: Record<string, unknown>): Array<{ item: Rosemary.Leaf; score?: number }>;
  exportToJSON(filename: string): void;
  importFromJSON(filename: string): void;
  importData(jsonData: string): void;
  createExportData(): { schemaVersion: number; leaves: Rosemary.LeafJSON[]; connections: Rosemary.ConnectionJSON[]; tags: string[] };
  exportToCSV(filename: string, options?: { delimiter?: string }): void;
  importFromCSV(filename: string, options?: { delimiter?: string }): Promise<void>;
  getLeafContentAsHTML(leafId: string): string | null;
  buildNetworkDataset(): { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> };
  clearAllData(): void;
}

export = Rosemary;
