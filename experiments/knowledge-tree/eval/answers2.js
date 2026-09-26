'use strict';

// Experiment 2: stored answers to eight questions that take several files to answer,
// as an agent would save them after answering each one the first time. Written
// against the repository at the commit that added this file, before the changes in
// setup2.js. Usage: writeAnswers(tree), after writeNotes(tree) from ../notes.js.

function writeAnswers(tree) {
  const by = 'claude (agent)';
  const instruction = 'Answer from the sources. Name methods, files, and values exactly.';
  const TESTS = ['Builder', 'ClaudeProvider', 'Leaf', 'Rosemary', 'RosemaryLLM', 'Stem', 'cli']
    .map(name => `src/_tests_/${name}.test.js`);
  const answer = (id, title, sources, gist, body) =>
    tree.write(id, { title, parent: 'answers', sources, instruction, gist, body, by });

  // Two file notes corrected while answering the questions below. The notes that use
  // them still hold, so they are confirmed rather than rewritten.
  const correct = (id, change) => {
    const { title, parent, gist, body, sources, instruction } = tree.node(id);
    tree.write(id, { title, parent, gist, body, instruction, by, sources: Object.keys(sources), ...change });
  };
  const oldLine = 'Every mutation autosaves by rewriting the whole JSON file; `saveData()` does nothing when `autoSave` is false.';
  if (!tree.node('file:src/Rosemary.js').body.includes(oldLine)) throw new Error('answers2: file:src/Rosemary.js note changed; update answers2.js');
  correct('file:src/Rosemary.js', {
    body: tree.node('file:src/Rosemary.js').body.replace(oldLine,
      'Most mutations autosave by rewriting the whole JSON file; `addTags` and the import methods do not (see the answers). `saveData()` does nothing when `autoSave` is false.')
  });
  correct('file:src/cli.js', {
    gist: '`rosemary` CLI on commander and inquirer: add, report, search, connect, related, import-csv, export-csv, delete, clear, rosemary, hello.'
  });
  tree.confirm('dir:src', by);
  tree.confirm('q:persistence', by);

  answer('q:unsaved', 'Which Rosemary methods change data without saving it?', ['src/Rosemary.js'],
    '`addTags`, `importData`, `importObject`, `importFromJSON`, and `importFromCSV` (through `processCsvImport`) change leaves or tags without writing the data file, even with autoSave on.',
    'Every other mutating method saves when autoSave is on: `addLeaf`, `removeLeaf`, `deleteLeaf`, `tagLeaf`, `updateLeaf`, `connectLeaves`, `connectDirectedLeaves`, and `connectSimilarLeaves` through `connectLeaves`. `initializeDefaultData` and `clearAllData` call `saveData` directly. `loadData` replaces the data from an existing file without saving, which is expected.');

  answer('q:untested', 'Which typed Rosemary methods have no test?', ['index.d.ts', 'glob:**/*.test.js', ...TESTS],
    '7 of the 32 methods declared for Rosemary in index.d.ts are never called by name in a test file: `updateLeaf`, `getAllTags`, `getLeavesByConnection`, `exportToJSON`, `exportToCSV`, `importFromCSV`, `getLeafContentAsHTML`.',
    'Checked by searching every *.test.js file for `.<method>(`. cli.test.js runs `import-csv` and `export-csv` through the command line, so those two methods run in tests without being called by name.');

  answer('q:cli-docs', 'Which CLI commands are missing from the README, and the reverse?', ['src/cli.js', 'readme.md'],
    'src/cli.js defines two commands that the README\'s CLI section does not list: `rosemary` and `hello`. Every command the README lists exists.',
    'Defined: add, report, search, connect, related, import-csv, export-csv, delete, clear, rosemary, hello. The README shows `import-csv <file>` and `export-csv <file>` with a required path; the CLI makes it optional, with defaults rosemary-import.csv and rosemary-export.csv in the current directory.');

  answer('q:data-file', 'Where does each entry point get its data file?', ['src/cli.js', 'src/api.js', 'scripts/visualize.js', 'src/Rosemary.js'],
    'CLI: `-d/--data-file`, then `ROSEMARY_DATA_FILE`. API server and scripts/visualize.js: `ROSEMARY_DATA_FILE` only. The Rosemary constructor: `options.dataFile`. Every default is rosemary-data.json in the current working directory.',
    'The CLI resolves the path in a preAction hook and passes it to both the constructor and `loadData`; `report` loads it again. src/api.js passes the environment variable to the constructor and `loadData` at startup; when it is unset, both fall back to the constructor default. scripts/visualize.js computes the same default itself with `path.join(process.cwd(), \'rosemary-data.json\')`.');

  answer('q:connect', 'How do the CLI, the REST API, and connectLeaves handle bad connect input?', ['src/cli.js', 'src/api.js', 'src/Rosemary.js'],
    'Only `connectLeaves` checks anything: an unknown id throws, the same id twice only logs a warning, and the relationship type is never validated.',
    [
      'Unknown id: `connectLeaves` throws "Leaf with id X not found". The CLI prints the message in red and exits 0; the API returns 400 with it.',
      'Same id twice: `connectLeaves` warns "Cannot connect a leaf to itself." and returns. The CLI and the API then report success.',
      'Missing id: commander rejects `rosemary connect` without two ids. The API does not check the body, so two missing ids count as the same id (200, nothing connected) and one missing id gives 400 "not found".',
      'Relationship type: any string is stored as given; the default is an empty string.'
    ].join('\n'));

  answer('q:release', 'What happens, in order, from `npm run release` until the package is on npm?', ['package.json', 'scripts/release.js', 'scripts/check-release.js'],
    'release.js checks the argument, a clean tree, and the main branch, runs npm test, runs npm version (commit and tag v<version>), pushes with tags, then `npm publish` runs prepublishOnly: npm test and check-release.js.',
    [
      '1. The bump must be patch, minor, major, a pre* bump, or x.y.z.',
      '2. `git status --porcelain` must be empty.',
      '3. The branch must be main unless `--force-branch`; `--dry-run` stops here.',
      '4. `npm test --silent`.',
      '5. `npm version <bump> -m "chore(release): %s"` bumps package.json, commits, and tags v<version>.',
      '6. `git push --follow-tags`.',
      '7. `npm publish`, whose prepublishOnly runs `npm test` and scripts/check-release.js: name and version present, clean tree, branch printed only, tag v<version> at HEAD, tag on origin, version not yet on npm, CHANGELOG mentions the version.',
      'The CHANGELOG is first checked after the tag is pushed.'
    ].join('\n'));

  answer('q:llm-docs', 'Which RosemaryLLM methods does docs/llm.md document?', ['docs/llm.md', 'src/llm/RosemaryLLM.js'],
    'All 10 methods in the docs/llm.md table exist. Three RosemaryLLM methods are not in it: `cosineSimilarity`, `rebuildMissingEmbeddings`, `scoreContextRelevance`.',
    'Documented: addEnhancedLeaf, generateEmbedding, semanticSearch, resolve, rebuildEmbeddings, buildPromptContext, pruneToTokenLimit, estimateTokens, generateStructuredPrompt, complete.');

  answer('q:scoring', 'How does buildPromptContext score and prune related leaves?', ['src/llm/RosemaryLLM.js'],
    'Relevance = 1/distance + 0.15 per shared tag (at most 0.3) + 0.2 if the edge has a type + recency (0.1 minus 0.002 per day of age, not below 0) + 0.2 × cosine similarity when both leaves have embeddings, capped at 1.',
    'Related leaves come from a breadth-first walk to `depth` (default 2) and are sorted by relevance, then distance. Pruning runs only when the estimate (JSON length / 4) exceeds `maxTokens` (default 1000): 1. drop related leaves with relevance below 0.5; 2. keep at most 3; 3. delete `core.tags`. The result is returned even if it is still over the budget.');
}

module.exports = { writeAnswers };
