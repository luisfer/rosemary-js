'use strict';

// The notes an agent (Claude, in the session that wrote this file) left behind
// after reading rosemary-js at commit 2d8359e. Usage: writeNotes(new Tree(dir)).

function writeNotes(tree) {
  const by = 'claude (agent)';
  const FILE = 'Say what this file does, its public surface, and anything a maintainer should know. One-line gist, then details.';
  const DIR = 'From the notes below: what this part is for and how the pieces fit. One-line gist, then details.';
  const file = (id, sources, parent, gist, body) =>
    tree.write(id, { title: sources[0], parent, gist, body, sources, instruction: FILE, by });
  const dir = (id, title, parent, uses, gist, body) =>
    tree.write(id, { title, parent, gist, body, uses, instruction: DIR, by });

  // src/
  file('file:src/Rosemary.js', ['src/Rosemary.js'], 'dir:src',
    'Core store: leaves, tags, typed connections, search, traversal (infer, walk, bridge, resolve), JSON and CSV persistence.',
    [
      'The `Rosemary` class keeps leaves in a Map, tags in a Set, and connections in a `Stem`.',
      'Every mutation autosaves by rewriting the whole JSON file; `saveData()` does nothing when `autoSave` is false.',
      'Traversal (`getRelatedLeaves`, `infer`, `walk`, `bridge`) follows outgoing edges only.',
      'Lookup: substring, Fuse.js fuzzy search (index rebuilt per call), and `resolve` (exact, alias, `aka`, fuzzy).',
      'Formats: schema-versioned JSON (v2), CSV for leaves only, Markdown to HTML through marked, DOMPurify, and jsdom.',
      'Known problems: invalid JSON on load resets the store and the next save overwrites the file; logs to stdout; new stores get a welcome leaf.'
    ].join('\n'));
  file('file:src/Leaf.js', ['src/Leaf.js'], 'dir:src',
    'Leaf: id, content, tag Set, metadata, created and modified timestamps; JSON round-trip.',
    'Mutators (`addTag`, `removeTag`, `updateContent`, `updateMetadata`) update `lastModified`. `toJSON` and `fromJSON` convert tags between a Set and an array and copy metadata.');
  file('file:src/Stem.js', ['src/Stem.js'], 'dir:src',
    'Edge store: Map from → Map to → type, so one relationship type per ordered pair.',
    [
      '`addConnection` writes both directions; `addDirectedConnection` writes one. A second type on the same pair replaces the first.',
      '`toJSON` emits `{from, to, type, directed}` and treats a pair as undirected when both directions carry the same type. `fromJSON` also reads the legacy `{leafId, connections}` shape.',
      '`getTotalConnections` divides by 2, which is wrong once directed edges exist.'
    ].join('\n'));
  file('file:src/edges.js', ['src/edges.js'], 'dir:src',
    'Reserved relationship types (implies, prerequisite-of, subset-of, co-occurs-with, contradicts, aka) and which are transitive.',
    'Exports the vocabulary and two predicates. `infer` walks transitive types; `resolve` reads `aka`. Custom relationship strings stay allowed.');
  file('file:src/cli.js', ['src/cli.js'], 'dir:src',
    '`rosemary` CLI on commander and inquirer: add, report, search, connect, related, delete, clear, CSV import and export.',
    'Loads the data file from `-d` or `ROSEMARY_DATA_FILE`. `add` and `clear` prompt interactively. Output uses chalk colors and emoji, and the `hello` command prints encouragement, both outside the voice contract.');
  file('file:src/api.js', ['src/api.js'], 'dir:src',
    'Express REST server under /api/v1 with Swagger UI; needs the optional Express packages.',
    'Routes for leaves, search, fuzzy search, tags, connections, export, and import. Loads `ROSEMARY_DATA_FILE` at startup and listens on `PORT` (default 3000).');
  file('file:src/Builder.js', ['src/Builder.js', 'src/presets/visualizations.js'], 'dir:src',
    'Builds standalone HTML visualizations (vis.js network, D3 mind map and Gantt, timeline, Chart.js heatmap) from CDN templates.',
    'Fluent API: `useTemplate`, `addVisualization`, `build(path, { serve })`. Data is inlined into the page. `serve: true` needs the optional http-server package.');
  file('file:src/llm/RosemaryLLM.js', ['src/llm/RosemaryLLM.js'], 'dir:src/llm',
    'Optional LLM layer: pluggable embeddings (default 64-dim n-gram hash), semantic search, token-budgeted context packs.',
    [
      'Extends `Rosemary`. Embeddings live in memory and are rebuilt per process.',
      '`buildPromptContext` walks to a depth, scores relevance, and prunes to `maxTokens` (characters / 4).',
      '`resolve` is async here and sync in the base class. `complete` hands a structured prompt to a provider or returns it.'
    ].join('\n'));
  file('file:src/llm/providers/ClaudeProvider.js', ['src/llm/providers/ClaudeProvider.js'], 'dir:src/llm',
    'Thin Messages API client over fetch; a stub unless `{ live: true }`; its default model is retired.',
    'Sends one user message with `max_tokens` 1024 by default. The default model, `claude-3-5-sonnet-20240620`, was retired on 2025-10-28, so live calls need an explicit `model`.');
  tree.write('dir:src/_tests_', {
    title: 'src/_tests_/', parent: 'dir:src', instruction: FILE, by,
    sources: ['Rosemary', 'Leaf', 'Stem', 'RosemaryLLM', 'ClaudeProvider', 'Builder', 'cli'].map(n => `src/_tests_/${n}.test.js`),
    gist: 'Jest suites: 57 tests across the store, Leaf, Stem, the LLM layer, the provider, Builder, and the CLI.',
    body: 'Core tests cover CRUD, tags, connections, search, sorting, JSON round-trip, and infer, resolve, walk, bridge. Some tests write fixtures into the repository root (`tmp/`, `tmp_cli/`, `tmp_roundtrip/`).'
  });
  dir('dir:src/llm', 'src/llm/', 'dir:src',
    ['file:src/llm/RosemaryLLM.js', 'file:src/llm/providers/ClaudeProvider.js'],
    'Optional LLM layer (`rosemary-js/llm`): embeddings, semantic search, context packs, a Claude provider stub.',
    'RosemaryLLM extends the core store; ClaudeProvider is the only provider. Nothing here persists beyond the core JSON file.');
  dir('dir:src', 'src/', 'repo',
    ['file:src/Rosemary.js', 'file:src/Leaf.js', 'file:src/Stem.js', 'file:src/edges.js', 'file:src/cli.js', 'file:src/api.js', 'file:src/Builder.js', 'dir:src/llm', 'dir:src/_tests_'],
    'The library: core store and graph model, CLI, REST API, HTML builder, optional LLM layer, tests.',
    'Graph model: Leaf (node), Stem (edges), edges.js (vocabulary). The store is synchronous and in memory, persisted to one JSON file. Package entry points: the store, `llm`, `builder`, `edges`, the provider, and `api`.');

  // scripts/
  file('file:scripts/release.js', ['scripts/release.js'], 'dir:scripts',
    'One-command release: checks the tree and branch, runs tests, bumps and tags, pushes, then publishes.',
    'Accepts patch, minor, major, pre* or an explicit version. `npm version` creates the commit and tag; `git push --follow-tags` publishes the tag; `npm publish` runs `prepublishOnly`, so the CHANGELOG and registry checks happen after the tag is public.');
  file('file:scripts/check-release.js', ['scripts/check-release.js'], 'dir:scripts',
    'Pre-publish guard: clean tree, HEAD tagged v<version> and pushed, version not on npm, CHANGELOG mentions it.',
    'Runs from `prepublishOnly`. The CHANGELOG check is a substring match. Stops at the first failure with a non-zero exit code.');
  file('file:scripts/visualize.js', ['scripts/visualize.js'], 'dir:scripts',
    'Writes a vis.js network page for the data file in `ROSEMARY_DATA_FILE`.',
    'Output path from the first argument; default `rosemary-network.html`.');
  file('file:scripts/evaluate-agent-context.js', ['scripts/evaluate-agent-context.js', 'evals/agent-context.json'], 'dir:scripts',
    'Agent-context eval: 4 deterministic tasks (resolve, infer, bridge, context pack); exits 1 on failure.',
    'Builds a fresh store per task from inline data and compares JSON output with the expected value. Not run in CI.');
  dir('dir:scripts', 'scripts/', 'repo',
    ['file:scripts/release.js', 'file:scripts/check-release.js', 'file:scripts/visualize.js', 'file:scripts/evaluate-agent-context.js'],
    'Release tooling, the visualization script, and the eval runner.',
    'release.js and check-release.js implement RELEASE.md. All of scripts/ ships in the npm tarball although the exports map makes it unreachable.');

  // docs/
  file('file:docs/direction.md', ['docs/direction.md'], 'dir:docs',
    'Forward notes: the 3.0.0 agent-context items (shipped), a planned separate MCP package, ESM migration deferred.',
    'Proposes `rosemary-mcp` with recall, walk, relate, add, and bridge tools. ESM waits because chalk 5, marked 15, and jsdom 26 are ESM-only.');
  file('file:docs/non-goals.md', ['docs/non-goals.md'], 'dir:docs',
    'What rosemary will not be: a database, vector DB, search engine, CRDT, web framework, schema system, or graph algorithms library.',
    'One process owns the JSON file. It says optional Express packages are not installed by default, which is false for npm.');
  file('file:docs/llm.md', ['docs/llm.md'], 'dir:docs',
    'Reference for the optional LLM layer: API table, embedder hook, ClaudeProvider, context-pack shape.',
    'Its provider example uses the retired `claude-3-5-sonnet-20240620` model id.');
  file('file:docs/plan-4.0.md', ['docs/plan-4.0.md'], 'dir:docs',
    'Proposal: 3.1.0 hardening, 4.0.0 breaking cleanup, 4.1.0 memory API, 4.2.0 formats, with a verified defect list.',
    'Defects S1–S5, G1–G4, A1–A7, P1–P4, R1–R5, V1 with evidence; eight directions compared; release through a pull request and CI trusted publishing.');
  dir('dir:docs', 'docs/', 'repo',
    ['file:docs/direction.md', 'file:docs/non-goals.md', 'file:docs/llm.md', 'file:docs/plan-4.0.md'],
    'Design docs: LLM layer reference, direction, non-goals, and the 3.1–4.2 plan.',
    'direction.md and non-goals.md bound the API; plan-4.0.md proposes the next line and corrects two claims in non-goals.md.');

  // Project files and examples
  file('file:package.json', ['package.json'], 'repo',
    'rosemary-js 3.0.2, Node 20+, CommonJS; 9 runtime and 5 optional dependencies; exports map; `rosemary` bin.',
    'Scripts: test, eval:agent-context, visualize, release, check-release, prepublishOnly. `files` ships 4.27 MB of logo PNGs plus scripts, examples, and evals.');
  tree.write('meta:project-docs', {
    title: 'README and project docs', parent: 'repo', instruction: FILE, by,
    sources: ['readme.md', 'CHANGELOG.md', 'AGENTS.md', 'RELEASE.md', 'CONTRIBUTING.md', 'SECURITY.md'],
    gist: 'README, changelog (1.0.0–3.0.2), agent rules and voice contract, release and contribution process, security policy.',
    body: 'AGENTS.md: spec-sheet voice, CommonJS, a Jest test per public method, Conventional Commits, no breaking v1.x API changes, heavy features as optional dependencies. RELEASE.md records past git and npm desyncs. SECURITY.md still lists 2.x as supported.'
  });
  tree.write('dir:examples', {
    title: 'examples/', parent: 'repo', instruction: FILE, by,
    sources: ['examples/botany_paper_network/botany_paper_network.js', 'examples/thailand_mindmap/thailand_mindmap.js', 'examples/llm/minimal_llm_example.js', 'examples/mcp/rosemary-mcp-prototype.js'],
    gist: 'Examples: paper and author network, Thailand mindmap page, minimal LLM context, MCP tool prototype.',
    body: 'The MCP prototype exposes six tools as plain functions; it is not a server. The botany example stores plain objects instead of Leaf instances, so tag lookups on it would fail.'
  });
  dir('repo', 'rosemary-js', null,
    ['dir:src', 'dir:scripts', 'dir:docs', 'file:package.json', 'meta:project-docs', 'dir:examples'],
    'Node knowledge-graph library: leaves, tags, typed links; CLI, REST API, HTML views, optional LLM context layer.',
    'Version 3.0.2, MIT, CommonJS. State lives in one JSON file rewritten on each change. Main risks: a data-loss path on invalid files, stdout logging, a 235-package default install, and a retired default model.');

  // Standing questions: answers that must stay true while the code changes.
  tree.write('answers', {
    title: 'Standing questions', parent: 'repo', by, instruction: 'Group node.',
    gist: 'Answers kept current against the notes they were derived from.'
  });
  tree.write('q:persistence', {
    title: 'How are connections saved and loaded?', parent: 'answers', by,
    instruction: 'Answer from the notes listed as inputs. Cite behavior, not opinions.',
    uses: ['file:src/Stem.js', 'file:src/Rosemary.js'],
    gist: 'As `{from, to, type, directed}` records under `connections`; the legacy shape still loads; one type per pair survives.',
    body: '`createExportData` writes `schemaVersion: 2`, `leaves`, `connections: stem.toJSON()`, and `tags`. `importObject` rebuilds the Stem with `Stem.fromJSON`, which accepts canonical records and the legacy `{leafId, connections}` shape.'
  });
  tree.write('q:release', {
    title: 'What happens, in order, when a release runs?', parent: 'answers', by,
    instruction: 'Answer from the notes listed as inputs. Cite behavior, not opinions.',
    uses: ['file:scripts/release.js', 'file:scripts/check-release.js'],
    gist: 'Tree and branch checks, tests, bump and tag, push, publish; the CHANGELOG is checked only at publish time.',
    body: '1. clean tree 2. on main 3. npm test 4. npm version (commit and tag) 5. git push --follow-tags 6. npm publish, whose prepublishOnly runs the tests and check-release.js. A missing CHANGELOG entry fails after the tag is public.'
  });

  // Cross-links between branches.
  tree.link('file:src/llm/RosemaryLLM.js', 'file:src/Rosemary.js', 'extends');
  tree.link('file:src/Rosemary.js', 'file:src/Stem.js', 'stores edges in');
  tree.link('file:src/cli.js', 'file:src/Rosemary.js', 'drives');
  tree.link('file:scripts/release.js', 'file:scripts/check-release.js', 'runs at publish');
  tree.link('file:docs/plan-4.0.md', 'file:docs/non-goals.md', 'contradicts', 'optional dependencies are installed by default');

  tree.write('q:tests', {
    title: 'Where are the tests, and how many suites are there?', parent: 'answers', by,
    instruction: 'Answer from the sources. State counts exactly.',
    sources: ['glob:**/*.test.js'],
    gist: '7 Jest suites, all in src/_tests_/: Rosemary, Leaf, Stem, RosemaryLLM, ClaudeProvider, Builder, cli.',
    body: 'Run with `npm test`. There are no tests outside src/_tests_/.'
  });
}

module.exports = { writeNotes };
