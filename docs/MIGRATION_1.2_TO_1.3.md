# Migration Guide: 1.2.x → 1.3.0 (Salem)

This release is backward-compatible for the core package API and CLI.

## Summary

- No required data migrations.
- Existing JSON data files (`leaves`, `connections`, `tags`) remain valid.
- Existing CLI command names/options remain valid.
- Existing CommonJS import style remains valid.

## What changed

1. Documentation was rewritten for factual accuracy.
2. Non-shipped LLM runtime module references were removed from shipped docs/examples.
3. CI and release process artifacts were added.
4. Package metadata was tightened for release consistency.

## Action checklist for upgraders

1. Upgrade package:

   ```bash
   npm install rosemary-js@^1.3.0
   ```

2. Validate your existing usage:

   - `require('rosemary-js')` import still resolves.
   - `new Rosemary({ dataFile, autoSave })` initialization still works.
   - existing CLI commands still run.

3. If you copied previous LLM preview snippets, migrate to core retrieval patterns:

   - use `fuzzySearch(query)` for retrieval,
   - use `getRelatedLeaves(id, depth)` for graph neighborhood context assembly,
   - format retrieved notes into prompt context in your app.

## Known compatibility notes

- `rosemary-js/llm` is not a shipped runtime module in 1.3.0.
- If your code referenced unreleased preview import paths under `src/llm/*`, replace them with core API usage.

