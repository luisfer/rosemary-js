/**
 * RosemaryLLM
 *
 * Optional LLM-facing layer on top of `Rosemary`. Adds embeddings,
 * similarity search, prompt-context building, and a pluggable provider.
 *
 * Honest caveat: the default `generateEmbedding` is a 64-dim character
 * n-gram hash. It is fast and zero-dependency but it is NOT a real
 * semantic embedding. For real semantic recall, replace it by passing
 * `config.embedder` (any function `(text) => Float32Array | number[]`)
 * — for example a `@xenova/transformers` pipeline, OpenAI embeddings,
 * or Voyage. The `semanticSearch` method falls back to lexical-ish
 * behavior when using the default embedder.
 */
const Rosemary = require('../Rosemary');

class RosemaryLLM extends Rosemary {
  constructor(config = {}) {
    super({ autoSave: config.autoSave });
    this.providers = {
      claude: config.claudeProvider || null,
    };
    this.defaultProvider = config.provider || 'claude';
    this.embedder = typeof config.embedder === 'function' ? config.embedder : null;
    this.embeddings = new Map();
  }

  async addEnhancedLeaf(content, tags = [], metadata = {}) {
    const leafId = this.addLeaf(content, tags);
    const embedding = await this.generateEmbedding(content, metadata);
    this.embeddings.set(leafId, embedding);
    return leafId;
  }

  async generateEmbedding(text) {
    if (this.embedder) {
      const result = await this.embedder(text);
      return result instanceof Float32Array ? result : Float32Array.from(result);
    }
    // Lightweight, deterministic local embedding to avoid external deps in M1
    // Produces a Float32Array of length 64 using hashed character n-grams
    const dim = 64;
    const vec = new Float32Array(dim);
    const str = (text || '').toLowerCase();
    for (let i = 0; i < str.length; i++) {
      const c1 = str.charCodeAt(i);
      const c2 = str.charCodeAt(i + 1) || 0;
      const c3 = str.charCodeAt(i + 2) || 0;
      const h = ((c1 * 31 + c2 * 17 + c3 * 13) >>> 0) % dim;
      vec[h] += 1;
    }
    // L2 normalize
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dim; i++) vec[i] = vec[i] / norm;
    return vec;
  }

  cosineSimilarity(a, b) {
    const len = Math.min(a.length, b.length);
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
    return dot / denom;
  }

  async semanticSearch(query, options = {}) {
    const { topK = 5, threshold = 0 } = options;
    const queryEmbedding = await this.generateEmbedding(query);
    const scores = [];
    for (const [leafId, embedding] of this.embeddings) {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      if (similarity >= threshold) scores.push({ leafId, similarity });
    }
    return scores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(s => ({ leaf: this.getLeafById(s.leafId), score: s.similarity }));
  }

  buildPromptContext(leafId, options = {}) {
    const {
      depth = 2,
      maxTokens = 1000,
      includeRelationships = true,
      includeTags = true
    } = options;

    const centerLeaf = this.getLeafById(leafId);
    // BFS up to depth collecting neighbors
    const visited = new Set([leafId]);
    const queue = [[leafId, 0]];
    const related = [];
    while (queue.length > 0) {
      const [currentId, d] = queue.shift();
      if (d >= depth) continue;
      const conns = this.stem.getConnectedLeaves(currentId);
      for (const [toId, relationship] of conns) {
        if (!visited.has(toId)) {
          const leaf = this.getLeafById(toId);
          related.push({
            content: leaf.content,
            relationship: includeRelationships ? relationship : undefined,
            relevance: 1.0
          });
          visited.add(toId);
          queue.push([toId, d + 1]);
        }
      }
    }

    const context = {
      core: {
        content: centerLeaf.content,
        tags: includeTags ? Array.from(centerLeaf.tags) : undefined
      },
      related,
      graph_depth: depth,
      total_nodes: related.length + 1
    };
    return this.pruneToTokenLimit(context, maxTokens);
  }

  pruneToTokenLimit(context, maxTokens) {
    const clone = JSON.parse(JSON.stringify(context));
    const estimate = () => this.estimateTokens(clone);
    let current = estimate();
    if (current <= maxTokens) return clone;
    // Remove low relevance
    clone.related = clone.related.filter(r => (r.relevance ?? 1) >= 0.5);
    current = estimate();
    if (current <= maxTokens) return clone;
    // Cap related
    clone.related = clone.related.slice(0, 3);
    current = estimate();
    if (current <= maxTokens) return clone;
    // Drop tags
    if (clone.core) delete clone.core.tags;
    current = estimate();
    return clone;
  }

  estimateTokens(obj) {
    try {
      return JSON.stringify(obj).length / 4;
    } catch {
      return 0;
    }
  }

  generateStructuredPrompt(context, userQuery) {
    return `CONTEXT_TYPE: Rosemary.js Knowledge Graph\nSTRUCTURE:\n- Core: Primary information node\n- Related: Pre-validated connections with explicit relationships\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}\n\nINSTRUCTION: Answer based ONLY on the provided graph structure. Be concise.\nQUERY: ${userQuery}`;
  }

  async complete(query, leafId = null, options = {}) {
    let context = {};
    if (leafId) {
      context = await this.buildPromptContext(leafId, options);
    } else {
      const results = await this.semanticSearch(query, { topK: 1 });
      if (results.length > 0) context = await this.buildPromptContext(results[0].leaf.id, options);
    }
    const prompt = this.generateStructuredPrompt(context, query);
    const provider = this.providers[this.defaultProvider];
    if (!provider) {
      return {
        prompt,
        note: 'No provider configured; returning prompt for inspection.'
      };
    }
    return provider.complete(prompt);
  }
}

module.exports = RosemaryLLM;

