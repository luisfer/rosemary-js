# Direction

Forward-looking notes for `rosemary-js`. Items marked as implemented are available in the current source and shipped in `3.0.0` (`Agent Context`). The remaining items are proposed milestones, not promises. They sit on top of the existing graph store and do not break the v1.x `Rosemary` class API.

The shape of the library stays the same: a leaf is a node, the stem is the relationship map, and the data file is one JSON document. Everything below either makes existing behavior more explicit or exposes the graph to LLMs in ways the current API does not.

## 1. Concept resolution: `resolve(input)` — implemented

```javascript
brain.resolve('jvscript');
// => { canonical: 'javascript', candidates: [...], confidence: 0.83 }
```

`resolve` answers: "given a noisy input string, which existing leaf or tag does the user almost certainly mean?"

It composes three signals:

- exact tag/content match;
- fuzzy match (existing `Fuse.js` index);
- embedding similarity (the embedder configured on `RosemaryLLM`, default n-gram).

Returns the best canonical candidate (or `null`), a ranked candidate list, and a confidence score. Use it for autocomplete, deduplication before `addLeaf`, and agent tools that map free text onto the graph.

## 2. Typed relationships with a small reserved vocabulary — implemented

`connectLeaves(a, b, relationshipType)` already accepts an arbitrary string. A small reserved vocabulary gives traversal and inference predictable meanings:

| Relationship | Meaning | Example |
|---|---|---|
| `implies` | knowing A implies knowing/being B | `JavaScript implies HTML` |
| `prerequisite-of` | A must be true / done / known before B | `Algebra prerequisite-of Calculus` |
| `subset-of` | A is a strict subset of B | `Sushi subset-of JapaneseFood` |
| `co-occurs-with` | A and B are observed together | `Espresso co-occurs-with Cortado` |
| `contradicts` | A and B cannot both hold | `Vegan contradicts Carnivore` |
| `aka` | A and B are alternative names | `JS aka JavaScript` |

User-defined relationship types continue to work. The reserved set is only for inference. `connectLeaves` remains bidirectional. Use `connectDirectedLeaves` when direction matters for `infer`.

```javascript
brain.infer(leafId, 'implies'); // transitive closure across `implies` edges
```

## 3. `walk(start, hops, mode)` — implemented

Generalize the existing `getRandomConnectedChain` into a single, parameterized walk:

```javascript
brain.walk(startId, 5, 'random');           // existing behavior
brain.walk(startId, 5, 'tag-affinity');     // bias next hop to leaves sharing tags
brain.walk(startId, 5, 'semantic-drift');   // tag-affinity fallback in the base class
brain.walk(startId, 5, 'widest-bridge');    // bias next hop by edge degree
```

Returns `Leaf[]`. The same primitive supports a random path (`random`), a tag-coherent path (`tag-affinity`), and a high-degree path (`widest-bridge`).

## 4. `bridge(a, b)` — implemented

```javascript
brain.bridge(idA, idB); // shortest typed path
// => [Leaf, Leaf, Leaf]  or  null
```

Returns the shortest sequence of leaves from `a` to `b` along existing edges, plus the relationship records for each hop. A future provider-backed variant may propose intermediate concept leaves as `proposed: true` so a human can accept or reject them before they become real nodes.

`bridge` is the API for asking how two leaves relate.

## 5. Pluggable embedders

The default `generateEmbedding` is a 64-dimensional character n-gram hash. It is honest about what it is. Two upgrade paths sit alongside it:

- **Local**: `@xenova/transformers`, `Xenova/all-MiniLM-L6-v2`, ~25 MB, runs in Node and browser. Recommended default for "real" semantic recall.
- **Hosted**: OpenAI `text-embedding-3-small` or Voyage `voyage-3-lite`. Cheaper than completion calls; requires an API key.

`RosemaryLLM` already accepts `config.embedder` as an opt-in. The library will not bundle either of these. Users install what they want.

## 6. MCP server: `rosemary-mcp`

A separate package (`rosemary-mcp`) should eventually implement the [Model Context Protocol](https://modelcontextprotocol.io). Claude Desktop, Cursor, Claude Code, and any MCP-aware client could then use a Rosemary store as project memory. The current repo includes a dependency-free prototype in `examples/mcp/` to test names, arguments, and responses before taking an MCP SDK dependency.

Tool surface:

| Tool | Body | Returns |
|---|---|---|
| `recall(query, topK)` | semantic + fuzzy match across leaves | `[{leaf, score}]` |
| `walk(start, hops, mode)` | drift through the graph | `Leaf[]` |
| `relate(a, b)` | shortest typed path | `Leaf[]` or `null` |
| `add(content, tags)` | append a new leaf | `{id}` |
| `bridge(a, b)` | propose intermediate concepts | `{path, proposed[]}` |

Configured per-vault: `MCP server "rosemary"` points at one `dataFile`. Multiple servers can run for multiple vaults. Read-write by default; read-only flag for shared/team vaults.

This is the layer that lets an LLM client read and write a Rosemary store across sessions.

## Order

1. Pluggable embedders and embedding rebuilds — implemented in `3.0.0`.
2. Typed edge vocabulary + `infer` — implemented in `3.0.0`.
3. `resolve(input)` — implemented in `3.0.0`.
4. `walk(start, hops, mode)` — implemented in `3.0.0`.
5. `bridge(a, b)` — implemented in `3.0.0`.
6. `rosemary-mcp` as a separate package after the prototype tool surface has eval coverage.

The implemented items shipped together as the `3.0.0` agent-context release. `rosemary-mcp` remains separate so the core package keeps zero MCP runtime dependencies.

## Maintenance: CommonJS → ESM

Rosemary-js currently ships as CommonJS (`require()` everywhere). Several upstream dependencies have shipped ESM-only majors that we cannot consume without converting:

- `chalk` 5+ (pinned to 4.x)
- `marked` 15+ (pinned to 14.x)
- `jsdom` 26+ (pinned to 24.x)

Dependabot still ships patch and minor bumps for these; major bumps are explicitly ignored in `.github/dependabot.yml` until the migration happens.

The migration is a single deliberate breaking change: convert `src/**/*.js` to ESM, switch `package.json` to `"type": "module"`, ship a CJS shim via `exports` for downstream consumers that still use `require('rosemary-js')`. Worth doing when the dependency pressure justifies a new major, not before. The cost of breaking downstream `require()` users twice in a year is higher than the cost of staying on chalk 4 / marked 14 / jsdom 24 for now.
