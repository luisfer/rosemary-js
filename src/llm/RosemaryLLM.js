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
    super({ autoSave: config.autoSave, dataFile: config.dataFile });
    this.providers = {
      claude: config.claudeProvider || null,
    };
    this.defaultProvider = config.provider || 'claude';
    this.embedder = typeof config.embedder === 'function' ? config.embedder : null;
    this.embeddings = new Map();
  }

  async addEnhancedLeaf(content, tags = [], metadata = {}) {
    const leafId = this.addLeaf(content, tags, metadata);
    const embedding = await this.generateEmbedding(content);
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
    await this.rebuildMissingEmbeddings();
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

  async rebuildMissingEmbeddings() {
    for (const leaf of this.getAllLeaves()) {
      if (!this.embeddings.has(leaf.id)) {
        this.embeddings.set(leaf.id, await this.generateEmbedding(leaf.content));
      }
    }
  }

  async rebuildEmbeddings() {
    this.embeddings = new Map();
    await this.rebuildMissingEmbeddings();
    return this.embeddings;
  }

  buildPromptContext(leafId, options = {}) {
    const {
      depth = 2,
      maxTokens = 1000,
      includeRelationships = true,
      includeTags = true,
      responseFormat = 'detailed'
    } = options;

    const centerLeaf = this.getLeafById(leafId);
    const visited = new Set([leafId]);
    const queue = [[leafId, 0, []]];
    const related = [];
    while (queue.length > 0) {
      const [currentId, d, path] = queue.shift();
      if (d >= depth) continue;
      const conns = this.stem.getConnectedLeaves(currentId);
      for (const [toId, relationship] of conns) {
        if (!visited.has(toId)) {
          const leaf = this.getLeafById(toId);
          const distance = d + 1;
          const nextPath = [...path, { from: currentId, to: toId, type: relationship }];
          related.push({
            id: leaf.id,
            content: leaf.content,
            tags: includeTags ? Array.from(leaf.tags) : undefined,
            metadata: responseFormat === 'detailed' ? leaf.metadata : undefined,
            relationship: includeRelationships ? relationship : undefined,
            distance,
            path: responseFormat === 'detailed' ? nextPath : undefined,
            relevance: this.scoreContextRelevance(centerLeaf, leaf, relationship, distance)
          });
          visited.add(toId);
          queue.push([toId, distance, nextPath]);
        }
      }
    }

    const context = {
      core: {
        id: centerLeaf.id,
        content: centerLeaf.content,
        tags: includeTags ? Array.from(centerLeaf.tags) : undefined,
        metadata: responseFormat === 'detailed' ? centerLeaf.metadata : undefined
      },
      related: related.sort((a, b) => b.relevance - a.relevance || a.distance - b.distance),
      graph_depth: depth,
      total_nodes: related.length + 1,
      response_format: responseFormat
    };
    return this.pruneToTokenLimit(context, maxTokens);
  }

  scoreContextRelevance(centerLeaf, relatedLeaf, relationship, distance) {
    const distanceScore = 1 / Math.max(distance, 1);
    const sharedTags = Array.from(centerLeaf.tags).filter(tag => relatedLeaf.tags.has(tag)).length;
    const tagScore = Math.min(sharedTags * 0.15, 0.3);
    const relationshipScore = relationship ? 0.2 : 0;
    const now = Date.now();
    const ageDays = Math.max((now - (relatedLeaf.lastModified || relatedLeaf.createdAt || now)) / 86400000, 0);
    const recencyScore = Math.max(0, 0.1 - (ageDays * 0.002));
    let semanticScore = 0;
    if (this.embeddings.has(centerLeaf.id) && this.embeddings.has(relatedLeaf.id)) {
      semanticScore = Math.max(0, this.cosineSimilarity(this.embeddings.get(centerLeaf.id), this.embeddings.get(relatedLeaf.id))) * 0.2;
    }
    return Math.min(1, Number((distanceScore + tagScore + relationshipScore + recencyScore + semanticScore).toFixed(3)));
  }

  pruneToTokenLimit(context, maxTokens) {
    const clone = JSON.parse(JSON.stringify(context));
    const estimate = () => this.estimateTokens(clone);
    let current = estimate();
    if (current <= maxTokens) return clone;
    clone.related = clone.related || [];
    clone.related.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
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

  async resolve(input, options = {}) {
    const base = super.resolve(input, options);
    await this.rebuildMissingEmbeddings();
    const semanticHits = await this.semanticSearch(input, {
      topK: options.limit || 5,
      threshold: options.semanticThreshold || 0
    });
    const candidates = [...base.candidates];
    semanticHits.forEach(hit => {
      const existing = candidates.find(candidate => candidate.type === 'leaf' && candidate.id === hit.leaf.id);
      const score = Math.min(1, hit.score * 0.8);
      if (existing) {
        existing.score = Math.max(existing.score, score);
        existing.reasons = Array.from(new Set([...(existing.reasons || []), 'semantic']));
      } else {
        candidates.push({
          type: 'leaf',
          id: hit.leaf.id,
          leaf: hit.leaf,
          score,
          reasons: ['semantic']
        });
      }
    });

    const ranked = candidates
      .sort((a, b) => b.score - a.score || (a.id || a.name).localeCompare(b.id || b.name))
      .slice(0, options.limit || 5);

    return {
      canonical: ranked[0] || null,
      candidates: ranked,
      confidence: ranked[0] ? ranked[0].score : 0
    };
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
module.exports.RosemaryLLM = RosemaryLLM;

