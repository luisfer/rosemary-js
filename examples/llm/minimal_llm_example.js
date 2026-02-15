const Rosemary = require('../../src/Rosemary');

/**
 * Minimal retrieval example for LLM-oriented workflows.
 *
 * This repository does not ship a dedicated `RosemaryLLM` module yet.
 * Use the core API to collect and format context, then pass it to your model provider.
 */
(async () => {
  const brain = new Rosemary({ autoSave: false });

  const a = brain.addLeaf('Tokens expire after 24 hours', ['auth', 'token']);
  const b = brain.addLeaf('401 error means authentication failed', ['auth', 'error']);
  const c = brain.addLeaf('POST /auth/refresh gets new tokens', ['auth', 'refresh']);

  brain.connectLeaves(a, b, 'same topic');
  brain.connectLeaves(a, c, 'recovery flow');

  const hits = brain.fuzzySearch('token expires');
  const related = brain.getRelatedLeaves(a, 1);

  const promptContext = [
    '# Retrieved notes',
    ...hits.map(({ item }) => `- ${item.content}`),
    '',
    '# Connected notes',
    ...related.map(leaf => `- ${leaf.content}`)
  ].join('\n');

  console.log(promptContext);
})();

