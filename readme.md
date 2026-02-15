# Rosemary.js

Rosemary.js is a Node.js library for building local knowledge graphs made of notes ("leaves"), tags, and bidirectional relationships.

It includes:

- a programmatic API (`Rosemary` class),
- a CLI (`rosemary`),
- optional REST API server (`src/api.js`),
- visualization helpers (`Builder` + presets).

> Version 1.0.0 is deprecated. Use 1.2.x or later.

---

## Scope of this package

This package currently ships the core knowledge graph tooling described in this README.

It does **not** currently ship a public `rosemary-js/llm` module.  
For LLM workflows today, use the core retrieval APIs (`getRelatedLeaves`, `fuzzySearch`, etc.) and pass assembled context to your provider SDK.

---

## Installation

```bash
npm install rosemary-js
```

---

## Quick start

```javascript
const Rosemary = require('rosemary-js');

const brain = new Rosemary({ autoSave: false });

const a = brain.addLeaf('JWT access tokens expire after 24 hours', ['auth', 'token']);
const b = brain.addLeaf('401 means the request is unauthenticated', ['auth', 'http']);

brain.connectLeaves(a, b, 'related behavior');

const related = brain.getRelatedLeaves(a, 1);
console.log(related.map(leaf => leaf.content));
```

If you want persistence in the current working directory:

```javascript
const brain = new Rosemary({ dataFile: './rosemary-data.json' });
brain.loadData();
```

---

## Core API overview

### Create and read leaves

- `addLeaf(content, tags?)`
- `getLeafById(id)`
- `getAllLeaves()`
- `updateLeaf(id, { content?, tags? })`
- `deleteLeaf(id)` / `removeLeaf(id)`

### Organize with tags

- `tagLeaf(id, ...tags)`
- `getLeavesByTag(tag)`
- `getAllTags()`
- `getMostUsedTags(limit?)`
- `suggestTags(partialTag, limit?)`

### Connect and traverse

- `connectLeaves(id1, id2, relationshipType?)`
- `getLeavesByConnection(id)`
- `getRelatedLeaves(id, maxDistance?)`
- `getMostConnectedLeaves(limit?)`
- `connectSimilarLeaves(similarityThreshold?)`

### Search and sort

- `getLeavesByContent(searchString)`
- `fuzzySearch(query, options?)`
- `getLeavesSortedByCreationDate(ascending?)`
- `getLeavesSortedByLastModified(ascending?)`
- `getLeavesSortedByTagCount(ascending?)`
- `getLeavesSortedByConnectionCount(ascending?)`

### Import/export and formatting

- `exportToJSON(filename)` / `importFromJSON(filename)`
- `exportToCSV(filename, { delimiter? })` / `importFromCSV(filename, { delimiter? })`
- `getLeafContentAsHTML(id)` (markdown rendered and sanitized)
- `buildNetworkDataset()`

---

## CLI usage

Install globally for shell usage:

```bash
npm install -g rosemary-js
```

Or run from a project where `rosemary-js` is installed:

```bash
npx rosemary --help
```

Common commands:

```bash
# use a custom data file
rosemary -d ./rosemary-data.json report

# add content interactively
rosemary -d ./rosemary-data.json add

# search by content
rosemary -d ./rosemary-data.json search "token"

# connect leaves
rosemary -d ./rosemary-data.json connect <id1> <id2> -r "related"

# import/export CSV
rosemary -d ./rosemary-data.json import-csv ./notes.csv -s ","
rosemary -d ./rosemary-data.json export-csv ./out.csv -s ","
```

Run `rosemary help <command>` for command-specific options.

---

## API server (optional)

The repository includes an Express API server in `src/api.js`.

Start it:

```bash
ROSEMARY_DATA_FILE=./rosemary-data.json node src/api.js
```

Default URL: `http://localhost:3000`  
Swagger UI: `http://localhost:3000/api-docs`

---

## Visualization

Generate a network HTML from your data file:

```bash
ROSEMARY_DATA_FILE=./rosemary-data.json npm run visualize
```

Or programmatically:

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

---

## Examples

- `examples/botany_paper_network/`
- `examples/thailand_mindmap/`
- `examples/llm/minimal_llm_example.js` (core retrieval context assembly for LLM pipelines)

---

## Data format

Persisted JSON shape:

```json
{
  "leaves": [],
  "connections": [],
  "tags": []
}
```

`connections` stores bidirectional relationships represented by `Stem#toJSON()`.

---

## Security notes

- `getLeafContentAsHTML()` sanitizes rendered markdown using DOMPurify.
- Do not commit local data files containing sensitive information.
- Keep API keys in environment variables if integrating external services.

---

## Backward compatibility

The project follows semantic versioning.  
Version 1.3.0 is intended to be backward compatible with 1.2.x for:

- core `Rosemary` API usage,
- CLI command names/options,
- persisted data format.

---

## Development

```bash
npm install
npm test
```

---

## License

MIT (see `LICENSE.md`).
