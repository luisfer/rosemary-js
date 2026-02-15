# Rosemary.js v1.3.0 Release Scope

## Release objective

Deliver a backward-compatible stabilization release focused on:

1. Documentation accuracy and polish.
2. Removal of broken or non-shipped feature claims.
3. Release process hardening for repeatable quality.

## Scope decisions

### LLM functionality

For v1.3.0, LLM support remains **roadmap only**.

- No `rosemary-js/llm` public module is shipped in this release.
- Documentation must not describe non-existent LLM APIs as currently available.
- Any LLM references are limited to roadmap/future direction statements.

### Compatibility policy

This release is semver-minor and preserves:

- CommonJS main import (`require('rosemary-js')`).
- Core `Rosemary` API shape in `src/Rosemary.js`.
- Existing CLI command names and options.
- Data file format (`leaves`, `connections`, `tags`).

## Out of scope

- New major architecture or breaking API changes.
- New production LLM provider integrations.
- Data format migration requirements.

