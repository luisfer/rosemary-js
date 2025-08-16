const { RosemaryLLM } = require('../../src/llm/RosemaryLLM');

(async () => {
  const brain = new RosemaryLLM();
  const a = await brain.addEnhancedLeaf('Tokens expire after 24 hours', ['auth', 'token']);
  await brain.addEnhancedLeaf('401 error means authentication failed', ['auth', 'error']);
  await brain.addEnhancedLeaf('POST /auth/refresh gets new tokens', ['auth', 'refresh']);

  const results = await brain.semanticSearch('token expires');
  console.log('semanticSearch top:', results[0]);

  const ctx = brain.buildPromptContext(a, { depth: 2, maxTokens: 400 });
  console.log('context tokens ~', brain.estimateTokens(ctx));

  const output = await brain.complete('What happens when my token expires?', a);
  console.log(output);
})();

