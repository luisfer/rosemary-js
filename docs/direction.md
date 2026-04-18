# Direction

Forward-looking notes for `rosemary-js`. These are proposed milestones, not promises. They sit on top of the existing graph store and do not break the v1.x `Rosemary` class. Each one is small and independently shippable.

The shape of the library stays the same: a leaf is a node, the stem is the set of typed edges between leaves, the data file is one JSON. Everything below either makes the existing surface honester (real embeddings, typed edges with a vocabulary) or exposes the existing surface to LLMs in ways the current API does not.

## 1. Concept resolution: `resolve(input)`

```javascript
brain.resolve('jvscript');
// => { canonical: 'javascript', candidates: [...], confidence: 0.83 }
```

`resolve` answers: "given a noisy input string, which existing leaf or tag does the user almost certainly mean?"

It composes three signals:

- exact tag/content match;
- fuzzy match (existing `Fuse.js` index);
- embedding similarity (the embedder configured on `RosemaryLLM`, default n-gram).

Returns the best canonical leaf id (or `null`), a ranked candidate list, and a confidence score. Useful as an autocompletion target, as a deduplication step on `addLeaf`, and as a tool surface for an LLM that wants to map a free-text concept onto the user's graph.

## 2. Typed edges with a small reserved vocabulary

`connectLeaves(a, b, relationshipType)` already accepts an arbitrary string. Add a small reserved vocabulary so that traversal and inference can do useful things:

| Edge | Meaning | Example |
|---|---|---|
| `implies` | knowing A implies knowing/being B | `JavaScript implies HTML` |
| `prerequisite-of` | A must be true / done / known before B | `Algebra prerequisite-of Calculus` |
| `subset-of` | A is a strict subset of B | `Sushi subset-of JapaneseFood` |
| `co-occurs-with` | A and B are observed together | `Espresso co-occurs-with Cortado` |
| `contradicts` | A and B cannot both hold | `Vegan contradicts Carnivore` |
| `aka` | A and B are alternative names | `JS aka JavaScript` |

User-defined edge types continue to work; the reserved set is only for inference.

```javascript
brain.infer(leafId, 'implies'); // transitive closure across `implies` edges
```

## 3. `walk(start, hops, mode)`

Generalize the existing `getRandomConnectedChain` into a single, parameterized walk:

```javascript
brain.walk(startId, 5, 'random');           // existing behavior
brain.walk(startId, 5, 'tag-affinity');     // bias next hop to leaves sharing tags
brain.walk(startId, 5, 'semantic-drift');   // bias next hop by embedding similarity
brain.walk(startId, 5, 'widest-bridge');    // bias next hop by edge degree
```

Returns `Leaf[]`. The same primitive supports a stream-of-consciousness drift through the graph (`semantic-drift`), a tag-coherent narrative (`tag-affinity`), and a graph-bridging tour (`widest-bridge`).

## 4. `bridge(a, b)`

```javascript
brain.bridge(idA, idB); // shortest typed path
// => [Leaf, Leaf, Leaf]  or  null
```

Returns the shortest sequence of leaves from `a` to `b` along existing edges. If no path exists and a provider is configured, optionally call the LLM to propose intermediate concept leaves; insert them as `proposed: true` so a human can accept or reject before they become real nodes.

`bridge` is the API a graph-aware UI uses to draw arrows between two distant ideas, and the API an LLM agent uses to ask "how does this relate to that?".

## 5. Pluggable embedders

The default `generateEmbedding` is a 64-dimensional character n-gram hash. It is honest about what it is. Two upgrade paths sit alongside it:

- **Local**: `@xenova/transformers`, `Xenova/all-MiniLM-L6-v2`, ~25 MB, runs in Node and browser. Recommended default for "real" semantic recall.
- **Hosted**: OpenAI `text-embedding-3-small` or Voyage `voyage-3-lite`. Cheaper than completion calls; requires an API key.

`RosemaryLLM` already accepts `config.embedder` as an opt-in. The library will not bundle either of these. Users install what they want.

## 6. MCP server: `rosemary-mcp`

The highest-leverage extension. A separate package (`rosemary-mcp`) implementing the [Model Context Protocol](https://modelcontextprotocol.io) so that Claude Desktop, Cursor, Claude Code, and any MCP-aware client can use a Rosemary store as long-term memory.

Tool surface:

| Tool | Body | Returns |
|---|---|---|
| `recall(query, topK)` | semantic + fuzzy match across leaves | `[{leaf, score}]` |
| `walk(start, hops, mode)` | drift through the graph | `Leaf[]` |
| `relate(a, b)` | shortest typed path | `Leaf[]` or `null` |
| `add(content, tags)` | append a new leaf | `{id}` |
| `bridge(a, b)` | propose intermediate concepts | `{path, proposed[]}` |

Configured per-vault: `MCP server "rosemary"` points at one `dataFile`. Multiple servers can run for multiple vaults. Read-write by default; read-only flag for shared/team vaults.

This is the layer that turns Rosemary from "a Node library" into "memory that lives across sessions for any LLM that speaks MCP."

## Order

1. Pluggable embedders (smallest change, biggest honesty win — already partially in place).
2. Typed edge vocabulary + `infer`.
3. `resolve(input)`.
4. `walk(start, hops, mode)`.
5. `bridge(a, b)`.
6. `rosemary-mcp` (separate package, depends on 1–5).

Each one ships behind a minor version. None of them break the v1.x API.
