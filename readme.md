# rosemary-js

<p align="center">
  <img src="assets/logo-2.png" alt="rosemary-js" width="240"/>
</p>

A graph-shaped knowledge store for Node. Leaves hold facts. Tags index them. Stems connect them. The store persists to one JSON file and exposes a library API, CLI, small HTTP API, and optional LLM context layer.

- Library: `require('rosemary-js')`
- CLI: `rosemary <command>`
- Optional LLM layer: `require('rosemary-js/llm')`

MIT. Node 20+.

## Install

```bash
npm install rosemary-js
```

For the CLI globally:

```bash
npm install -g rosemary-js
```

## Quick start

```javascript
const Rosemary = require('rosemary-js');

const brain = new Rosemary({ dataFile: './my-data.json' });
brain.loadData();

const a = brain.addLeaf('JavaScript runs in browsers and Node', ['programming', 'web']);
const b = brain.addLeaf('HTML structures web documents', ['programming', 'web']);
brain.connectLeaves(a, b, 'co-occurs-with');

console.log(brain.getRelatedLeaves(a).map(l => l.content));
```

## Versions

Current: `2.0.0`. Version `2.0.0` is the clean Node 20 baseline. The full version table lives in [`CHANGELOG.md`](./CHANGELOG.md).

## Concepts

- **Leaf** — a node with `content`, `tags`, `metadata`, `id`, and timestamps.
- **Stem** — the relationship map between leaves.
- **Tag** — a free-form label used for lookup and fuzzy search.
- **Connection** — a typed relationship between two leaves.

Persistence is a single JSON file at `options.dataFile` (default `./rosemary-data.json`). The file is rewritten on every mutation when `autoSave` is true (default).

## API

### Constructor

```javascript
new Rosemary({ dataFile: './data.json', autoSave: true })
```

### Leaves

| Method | Returns | Notes |
|---|---|---|
| `addLeaf(content, tags = [], metadata = {})` | `string` (id) | nanoid-style id |
| `getLeafById(id)` | `Leaf` | throws if missing |
| `getAllLeaves()` | `Leaf[]` | |
| `updateLeaf(id, { content?, tags?, metadata? })` | `Leaf` | atomic |
| `removeLeaf(id)` / `deleteLeaf(id)` | `void` / `boolean` | also removes connections |
| `getLeavesByConnection(id)` | `Leaf[]` | |
| `getLeavesByContent(query)` | `Leaf[]` | substring match |
| `fuzzySearch(query, fuseOptions?)` | `{ item, score }[]` | content + tags |

### Tags

| Method | Returns |
|---|---|
| `tagLeaf(id, ...tags)` | `void` |
| `getAllTags()` | `{ name, count, leaves }[]` |
| `getLeavesByTag(tag)` | `Leaf[]` |
| `getMostUsedTags(limit = 5)` | `{ name, count, ... }[]` |
| `suggestTags(partial, limit = 5)` | `string[]` |

### Connections

| Method | Returns |
|---|---|
| `connectLeaves(idA, idB, relationshipType = '')` | `void` |
| `connectDirectedLeaves(fromId, toId, relationshipType = '')` | `void` |
| `getRelatedLeaves(id, maxDistance = 2)` | `Leaf[]` (BFS) |
| `infer(id, relationshipType = 'implies')` | `{ leaf, relationship, distance, path }[]` |
| `walk(startId?, maxLength = 5, mode = 'random')` | `Leaf[]` |
| `bridge(fromId, toId)` | `{ path, relationships, distance } \| null` |
| `connectSimilarLeaves(threshold = 1)` | `void` (auto-connects on shared tags) |
| `getMostConnectedLeaves(limit = 5)` | `Leaf[]` |
| `getRandomConnectedChain(startId?, maxLength = 5)` | `Leaf[]` |

Reserved relationship types are exported from `require('rosemary-js/edges')`: `implies`, `prerequisite-of`, `subset-of`, `co-occurs-with`, `contradicts`, and `aka`. Custom relationship strings still work.

### Resolve

```javascript
const result = brain.resolve('JS');
// => { canonical, candidates, confidence }
```

`resolve` combines exact content matches, tags, metadata aliases, `aka` relationships, and Fuse.js fuzzy matches. `RosemaryLLM.resolve()` also adds semantic candidates when embeddings are available.

### Sorting

`getLeavesSortedByCreationDate(asc?)`, `getLeavesSortedByLastModified(asc?)`, `getLeavesSortedByTagCount(asc?)`, `getLeavesSortedByConnectionCount(asc?)`, `getTagsSortedByLeafCount(asc?)`.

### Import / export

| Method | Notes |
|---|---|
| `loadData(file?)` / `saveData()` | reads/writes schema-versioned `dataFile` |
| `importData(jsonString)` | parses an in-memory JSON string |
| `exportToJSON(file)` / `importFromJSON(file)` | full snapshot |
| `exportToCSV(file, { delimiter = ',' })` | leaves only (not connections) |
| `importFromCSV(file, { delimiter = ',' })` | returns a `Promise` |
| `getLeafContentAsHTML(id)` | Markdown → sanitized HTML (DOMPurify) |
| `buildNetworkDataset()` | `{ nodes, edges }` for visualizations |
| `clearAllData()` | resets to default seed leaf |

## CLI

```bash
rosemary add                              # interactive prompt
rosemary report                           # list all leaves
rosemary search <query>                   # substring search
rosemary connect <id1> <id2> [-r <rel>]
rosemary related <id> [-d <distance>]
rosemary delete <id>
rosemary clear
rosemary import-csv <file> [-s <sep>]
rosemary export-csv <file> [-s <sep>]
```

All commands accept `-d, --data-file <path>` to point at a specific data file. The env var `ROSEMARY_DATA_FILE` works too.

```bash
rosemary report -d ./project-a.json
ROSEMARY_DATA_FILE=./project-a.json rosemary report
```

## Visualization

Generate a network HTML from the current data file:

```bash
ROSEMARY_DATA_FILE=./rosemary-data.json npm run visualize
```

Programmatic:

```javascript
const Rosemary = require('rosemary-js');
const Builder = require('rosemary-js/builder');

const brain = new Rosemary({ dataFile: './rosemary-data.json' });
brain.loadData();

const data = brain.buildNetworkDataset();
new Builder(brain)
  .useTemplate('dashboard')
  .addVisualization('network', data, {})
  .build('./graph.html');
```

`Builder` requires `http-server` only if you call `.build(path, { serve: true })`. Install it on demand: `npm install http-server`.

## Optional LLM layer

```javascript
const RosemaryLLM = require('rosemary-js/llm');

const brain = new RosemaryLLM({ autoSave: false });
const id = await brain.addEnhancedLeaf('Tokens expire after 24 hours', ['auth']);
await brain.addEnhancedLeaf('401 means authentication failed', ['auth', 'error']);

const results = await brain.semanticSearch('token expires');
const ctx = brain.buildPromptContext(id, { depth: 2, maxTokens: 500 });
const res = await brain.complete('What happens when my token expires?', id);
```

The default `generateEmbedding` is a 64-dimensional character n-gram hash. It is fast and zero-dependency but it is not a real semantic embedding. For real semantic recall, pass a `config.embedder` function:

```javascript
const brain = new RosemaryLLM({
  embedder: async (text) => myTransformersPipeline(text)
});
```

Providers (`ClaudeProvider`) are stubs by default. They return the prompt for inspection unless constructed with `{ live: true }` and an API key. Never hardcode keys; read from environment variables or a secret manager.

```javascript
const ClaudeProvider = require('rosemary-js/llm/providers/ClaudeProvider');

const brain = new RosemaryLLM({
  claudeProvider: process.env.CLAUDE_API_KEY
    ? new ClaudeProvider(process.env.CLAUDE_API_KEY, { live: true })
    : null
});
```

## HTTP API

`src/api.js` is an Express server exposing `/api/v1/*` and Swagger UI at `/api-docs`. Requires `express`, `body-parser`, `swagger-jsdoc`, `swagger-ui-express` (declared as `optionalDependencies` from 1.3.0 onwards). Run with:

```bash
ROSEMARY_DATA_FILE=./data.json node src/api.js
```

## Examples

- `examples/botany_paper_network/` — paper / author / tag graph (CSV and JSON variants)
- `examples/thailand_mindmap/` — concept mindmap
- `examples/llm/minimal_llm_example.js` — opt-in LLM context-building
- `examples/mcp/` — dependency-free prototype of the future MCP package

## Agent Context

Use Rosemary when an agent needs structured recall without loading a full knowledge base into the prompt. Store facts, decisions, test commands, release constraints, and known failure modes as leaves. Connect them with typed relationships. Ask for a compact context pack.

```mermaid
flowchart LR
  dataFile["JSON data file"] --> graph["Leaves, tags, relationships"]
  graph --> resolve["resolve / infer / bridge"]
  graph --> contextPack["buildPromptContext"]
  contextPack --> agent["Coding agent"]
  agent --> checks["tests / evals / release gates"]
```

Run the included context eval:

```bash
npm run eval:agent-context
```

## Direction

Forward-looking notes live in [`docs/direction.md`](./docs/direction.md). Non-goals live in [`docs/non-goals.md`](./docs/non-goals.md).

## Releasing

A single command, governed by [`RELEASE.md`](./RELEASE.md):

```bash
npm run release -- patch   # or minor, or major
```

This runs the test suite, asserts the working tree is clean, bumps the version, creates the matching git tag, pushes with `--follow-tags`, and publishes to npm. The version in `package.json` is the single source of truth; git tag and npm registry must match.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Run `npm test` before opening a PR.

## License

MIT. See [`LICENSE.md`](./LICENSE.md).

## Maintainer

Maintained by [@luisfer](https://github.com/luisfer).
