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
  });

  test('complete returns prompt when no provider configured', async () => {
    const brain = new RosemaryLLM({ autoSave: false });
    const a = brain.addLeaf('Fact about rosemary', ['herb']);
    const res = await brain.complete('What about rosemary?', a);
    expect(res).toHaveProperty('prompt');
    expect(res).toHaveProperty('note');
  });
});

