# Non-goals

Things `rosemary-js` will not become. Recorded so the API stays small.

- **A database.** No transactions, no concurrent writers, no replication. One process owns the JSON file. If two processes write at once, the last one wins. If you need a database, use one.
- **A vector database.** The embedding layer exists for "find me the leaves most like this idea" inside a single graph. It does not aim at million-vector scale, ANN indexes, sharding, or hybrid query planners. Embeddings are stored in memory and rebuilt from leaf content on demand.
- **A full-text search engine.** Fuzzy search over leaf `content` and `tags` is enough. There is no analyzer stack, no ranking model, no positional index, no stemming pipeline.
- **A CRDT or sync engine.** No multi-device merge logic. Two divergent JSON files cannot be reconciled by the library; that is a problem for a layer above it.
- **A web framework.** The included REST API and visualization server are convenience entry points. They are intentionally thin and live in `optionalDependencies`. The base library does not pull Express on install.
- **A headless graph editor.** No undo stack, no operational transforms, no event bus. Mutations are direct method calls; if you want history, write a wrapper.
- **An LLM provider.** `RosemaryLLM` is a context-builder and a thin adapter. It does not own model selection, prompt templating beyond minimal scaffolding, retry logic, streaming UIs, token accounting, or cost reporting.
- **A schema system.** Leaves carry free-form `content` and `metadata`. There is no validator, no migration runner, no field type system. If you need shape guarantees, encode them in your application.
- **A graph algorithms library.** No PageRank, no community detection, no centrality measures. The `walk` / `bridge` / `infer` primitives are deliberately simple. If you need real graph algorithms, export to a format `graphology` understands.
- **A general-purpose ontology.** The reserved edge vocabulary (`implies`, `prerequisite-of`, `subset-of`, `co-occurs-with`, `contradicts`, `aka`) exists to make inference predictable; it is not a knowledge representation framework. Custom edge strings continue to work and the library does not interpret them.
- **A cross-language project.** JavaScript / Node / browser. No Python port maintained here. No bindings.
- **A monorepo.** The MCP server, when it lands, lives in its own package (`rosemary-mcp`) so that the core library has zero MCP dependencies.
