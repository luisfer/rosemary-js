# Optional LLM layer

`require('rosemary-js/llm')` exposes `RosemaryLLM`, a subclass of `Rosemary` that adds embeddings, similarity search, prompt-context building, and a pluggable provider. All v1.x `Rosemary` methods continue to work unchanged.

## When to use it

Use `RosemaryLLM` when you want to:

- store leaves and look them up by similarity, not just substring or fuzzy match;
- assemble a small, structured context object from a leaf's neighborhood, capped at a token budget, suitable for sending to an LLM;
- run that context through a provider (Claude today; others can be added the same way).

If you only need the graph store, use the base `Rosemary` class.

## Quick start

```javascript
const { RosemaryLLM } = require('rosemary-js/llm');

const brain = new RosemaryLLM({ autoSave: false });

const a = await brain.addEnhancedLeaf('Tokens expire after 24 hours', ['auth', 'token']);
const b = await brain.addEnhancedLeaf('401 means authentication failed', ['auth', 'error']);
const c = await brain.addEnhancedLeaf('POST /auth/refresh issues a new token', ['auth', 'refresh']);
brain.connectLeaves(a, b, 'causes-error');
brain.connectLeaves(b, c, 'resolved-by');

const hits = await brain.semanticSearch('token expires');
const ctx  = brain.buildPromptContext(a, { depth: 2, maxTokens: 500 });
const res  = await brain.complete('What happens when my token expires?', a);
```

## API

### Constructor

```javascript
new RosemaryLLM({
  autoSave,
  embedder,         // optional: (text) => Float32Array | number[] | Promise<...>
  claudeProvider,   // optional ClaudeProvider instance
  provider,         // default 'claude'
})
```

### Methods

| Method | Notes |
|---|---|
| `addEnhancedLeaf(content, tags?, metadata?)` | adds a leaf and stores its embedding |
| `generateEmbedding(text)` | uses `config.embedder` if provided; else the local n-gram hash |
| `semanticSearch(query, { topK = 5, threshold = 0 })` | cosine similarity over stored embeddings |
| `buildPromptContext(leafId, { depth = 2, maxTokens = 1000, includeRelationships = true, includeTags = true })` | BFS up to `depth`, then prunes to fit `maxTokens` |
| `pruneToTokenLimit(context, maxTokens)` | progressive pruning: low-relevance neighbors first, then cap, then drop tags |
| `estimateTokens(obj)` | rough estimate (`length / 4`) |
| `generateStructuredPrompt(context, query)` | wraps the context in an instruction block |
| `complete(query, leafId?, options?)` | builds context, calls the provider; returns the prompt if no provider is configured |

## Embeddings: honest caveat

The default `generateEmbedding` is a 64-dimensional character n-gram hash. It is fast, deterministic, and zero-dependency. It is **not** a real semantic embedding — `"javascript"` and `"jvscript"` will look similar (good), but `"car"` and `"automobile"` will not (bad).

Replace it by passing `config.embedder`:

```javascript
const { pipeline } = require('@xenova/transformers');
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const brain = new RosemaryLLM({
  embedder: async (text) => {
    const out = await extractor(text, { pooling: 'mean', normalize: true });
    return out.data;
  }
});
```

`@xenova/transformers` is not a dependency of `rosemary-js`. Install it explicitly if you want it.

## Providers

Providers expose a single `complete(prompt) -> Promise<object>` method.

### `ClaudeProvider`

```javascript
const ClaudeProvider = require('rosemary-js/src/llm/providers/ClaudeProvider');

const provider = new ClaudeProvider(process.env.CLAUDE_API_KEY, {
  live: true,
  model: 'claude-3-5-sonnet-20240620',
  maxTokens: 1024,
});

const brain = new RosemaryLLM({ claudeProvider: provider });
```

Without `{ live: true }` the provider returns the prompt object for inspection and does not call the network. This is the default so that tests and dry runs do not hit the API.

### Adding another provider

Implement a class with a single `async complete(prompt)` method that returns a JSON-serializable object. Pass an instance into `RosemaryLLM` via a config field, then register it under `this.providers[name]` and set `defaultProvider`.

## Token-budget context building

`buildPromptContext` performs a breadth-first walk from `leafId` up to `depth` hops, builds an object shaped like:

```json
{
  "core":    { "content": "...", "tags": ["..."] },
  "related": [{ "content": "...", "relationship": "...", "relevance": 1.0 }],
  "graph_depth": 2,
  "total_nodes": 4
}
```

…and then `pruneToTokenLimit` shrinks it by, in order: dropping low-relevance neighbors, capping `related` to three, dropping `core.tags`. The token estimate is rough (`length / 4`); for production budgets, use a real tokenizer.

## What this is not

- A RAG framework. Use LlamaIndex or LangChain if you want one.
- A vector database. The embedding map is in-memory; persistence is the same JSON file as the rest.
- A managed service.

See [`./direction.md`](./direction.md) for the forward-looking notes and [`./non-goals.md`](./non-goals.md) for what this library will not become.
