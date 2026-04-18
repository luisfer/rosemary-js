# rosemary-js

<p align="center">
  <img src="assets/logo-2.png" alt="rosemary-js" width="240"/>
</p>

A graph-shaped knowledge store for Node. Stores ideas as leaves (nodes) with tags and typed connections, persists to a single JSON file, and exposes a CLI, a small HTTP API, and an optional LLM context layer.

- Library: `require('rosemary-js')`
- CLI: `rosemary <command>`
- Optional LLM layer: `require('rosemary-js/llm')`

MIT. Node 18+.

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

Current: `1.2.1`. Versions `1.0.0` and `1.2.0` were tagged in git but contain bugs or were never published to npm; do not use them. Always install `1.2.1` or later. The full version table lives in [`CHANGELOG.md`](./CHANGELOG.md).

## Concepts

- **Leaf** — a node holding `content` (string), `tags` (set), `id`, and timestamps.
- **Stem** — the set of bidirectional connections between leaves, each with an optional `relationshipType` string.
- **Tag** — a free-form label. Tags index leaves and feed fuzzy search.
- **Connection** — a typed edge between two leaves.

Persistence is a single JSON file at `options.dataFile` (default `./rosemary-data.json`). The file is rewritten on every mutation when `autoSave` is true (default).

## API

### Constructor

```javascript
new Rosemary({ dataFile: './data.json', autoSave: true })
```

### Leaves

| Method | Returns | Notes |
|---|---|---|
| `addLeaf(content, tags = [])` | `string` (id) | nanoid-style id |
| `getLeafById(id)` | `Leaf` | throws if missing |
| `getAllLeaves()` | `Leaf[]` | |
| `updateLeaf(id, { content?, tags? })` | `Leaf` | atomic |
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
| `getRelatedLeaves(id, maxDistance = 2)` | `Leaf[]` (BFS) |
| `connectSimilarLeaves(threshold = 1)` | `void` (auto-connects on shared tags) |
| `getMostConnectedLeaves(limit = 5)` | `Leaf[]` |
| `getRandomConnectedChain(startId?, maxLength = 5)` | `Leaf[]` |

### Sorting

`getLeavesSortedByCreationDate(asc?)`, `getLeavesSortedByLastModified(asc?)`, `getLeavesSortedByTagCount(asc?)`, `getLeavesSortedByConnectionCount(asc?)`, `getTagsSortedByLeafCount(asc?)`.

### Import / export

| Method | Notes |
|---|---|
| `loadData(file?)` / `saveData()` | reads/writes `dataFile` |
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
const Builder = require('rosemary-js/src/Builder');

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
const { RosemaryLLM } = require('rosemary-js/llm');

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
const ClaudeProvider = require('rosemary-js/src/llm/providers/ClaudeProvider');

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

## Direction

The forward-looking design notes — typed implication edges, concept resolution, drift walks, an MCP server, pluggable embedders — live in [`docs/direction.md`](./docs/direction.md). Non-goals in [`docs/non-goals.md`](./docs/non-goals.md).

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

## Author

Maintained by [@luisfer](https://github.com/luisfer).
