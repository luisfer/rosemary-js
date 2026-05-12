const RosemaryLLM = require('../llm/RosemaryLLM');

describe('RosemaryLLM (M1)', () => {
  test('addEnhancedLeaf stores embeddings and supports semantic search', async () => {
    const brain = new RosemaryLLM({ autoSave: false });
    const a = await brain.addEnhancedLeaf('API tokens expire after 24 hours', ['auth', 'token']);
    const b = await brain.addEnhancedLeaf('401 error means authentication failed', ['auth', 'error']);
    const c = await brain.addEnhancedLeaf('POST /auth/refresh gets new tokens', ['auth', 'refresh']);

    const results = await brain.semanticSearch('token expires');
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map(r => r.leaf.id);
    expect(ids).toContain(a);
  });

  test('buildPromptContext traverses graph up to depth', async () => {
    const brain = new RosemaryLLM({ autoSave: false });
    const id1 = brain.addLeaf('Core', ['x']);
    const id2 = brain.addLeaf('Neighbor 1', ['x']);
    const id3 = brain.addLeaf('Neighbor 2', ['x']);
    brain.connectLeaves(id1, id2, 'related');
    brain.connectLeaves(id2, id3, 'related');

    const ctx1 = brain.buildPromptContext(id1, { depth: 1, maxTokens: 10000 });
    expect(ctx1.related.length).toBe(1);
    const ctx2 = brain.buildPromptContext(id1, { depth: 2, maxTokens: 10000 });
    expect(ctx2.related.length).toBe(2);
    expect(ctx2.core.id).toBe(id1);
    expect(ctx2.related[0]).toHaveProperty('relevance');
    expect(ctx2.related[0]).toHaveProperty('distance');
  });

  test('complete returns prompt when no provider configured', async () => {
    const brain = new RosemaryLLM({ autoSave: false });
    const a = brain.addLeaf('Fact about rosemary', ['herb']);
    const res = await brain.complete('What about rosemary?', a);
    expect(res).toHaveProperty('prompt');
    expect(res).toHaveProperty('note');
  });

  test('semanticSearch rebuilds missing embeddings after import/load', async () => {
    const brain = new RosemaryLLM({ autoSave: false });
    brain.addLeaf('JavaScript powers React apps', ['javascript']);

    expect(brain.embeddings.size).toBe(0);
    const results = await brain.semanticSearch('javascript');

    expect(brain.embeddings.size).toBe(1);
    expect(results[0].leaf.content).toBe('JavaScript powers React apps');
  });

  test('custom embedder is used and normalized to Float32Array', async () => {
    const embedder = jest.fn(async () => [1, 0, 0]);
    const brain = new RosemaryLLM({ autoSave: false, embedder });

    const id = await brain.addEnhancedLeaf('Custom embedding', ['llm']);

    expect(embedder).toHaveBeenCalledWith('Custom embedding');
    expect(brain.embeddings.get(id)).toBeInstanceOf(Float32Array);
  });

  test('pruneToTokenLimit keeps higher relevance context first', () => {
    const brain = new RosemaryLLM({ autoSave: false });
    const context = {
      core: { id: 'a', content: 'Core', tags: ['x'] },
      related: [
        { id: 'b', content: 'low '.repeat(100), relevance: 0.2 },
        { id: 'c', content: 'high', relevance: 0.9 }
      ]
    };

    const pruned = brain.pruneToTokenLimit(context, 20);

    expect(pruned.related.map(item => item.id)).toEqual(['c']);
  });

  test('resolve combines lexical and semantic candidates', async () => {
    const brain = new RosemaryLLM({ autoSave: false });
    const id = await brain.addEnhancedLeaf('JavaScript runtime skill', ['node']);

    const result = await brain.resolve('javascript');

    expect(result.canonical.id).toBe(id);
    expect(result.candidates[0].reasons.length).toBeGreaterThan(0);
  });
});

