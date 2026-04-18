# Changelog

All notable changes to this project are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-04-18 (Gorizia)

A clean restart. No breaking changes to the v1.x `Rosemary` class API. The major bump signals a wiped GitHub release history, a rewritten README, a real release process, a documented forward direction, and a tightened modernization baseline (Node 20 minimum, Dependabot, security policy).

### Added
- `AGENTS.md` at repo root: project profile, voice contract, code conventions, release rules, and direction pointers for any AI agent working on the repo.
- `RELEASE.md` checklist and `scripts/release.js` + `scripts/check-release.js` for one-command, guarded releases. Pre-flight refuses to publish if working tree is dirty, branch is not `main`, tag does not match `HEAD`, tag is not pushed, the version already exists on npm, or `CHANGELOG.md` does not mention the new version.
- `package.json` `exports` map: `.`, `./llm`, `./builder`, `./api`, `./package.json`.
- `RosemaryLLM.config.embedder` hook for plugging in real embedders (e.g. `@xenova/transformers`, OpenAI, Voyage). The default character n-gram hash stays as zero-dependency fallback and is now documented as such.
- `docs/llm.md` — plain reference for the LLM extension layer.
- `docs/direction.md` — forward-looking notes (concept resolution, typed edge vocabulary, walk modes, bridge, pluggable embedders, MCP server). Each item is independently shippable.
- `docs/non-goals.md` — what the library will not become.
- `.github/workflows/ci.yml` — Jest on Node 20 and 22 for every PR and `main` push.
- `.github/workflows/release.yml` — disabled by default; flip the gate and add `NPM_TOKEN` to publish on tag push.
- `.github/dependabot.yml` — weekly npm and GitHub Actions dependency PRs.
- `SECURITY.md` — supported versions, vulnerability disclosure email, 7-day acknowledgement window.
- `.nvmrc` pinned to Node 20.

### Changed
- README rewritten in spec-sheet voice: plain, declarative, no marketing copy, no decorative emoji, no LinkedIn-style "About the Author" pitch, no version-codename herb prose.
- `CONTRIBUTING.md` rewritten in spec-sheet voice: setup, branching, conventional commits, voice rule, release rule (don't `npm publish` by hand), security pointer.
- `package.json` `engines.node = ">=20"` (Node 18 reached end-of-life on April 30, 2025).
- `express`, `body-parser`, `swagger-jsdoc`, `swagger-ui-express`, `http-server` moved from `dependencies` to `optionalDependencies`. Base library and CLI no longer pull Express on every install.
- `package.json` `description` and `keywords` refreshed to reflect what the library actually is.

### Fixed
- `src/llm/providers/ClaudeProvider.js` syntax error (`async complete(prompt)() {` → valid method) that prevented `require('rosemary-js/llm/providers/ClaudeProvider')` from loading. Provider now also gracefully handles missing global `fetch` and gates real network calls behind `{ live: true }`.
- `docs/` no longer in `.gitignore`. The `docs/` directory ships with the repo and the npm tarball.
- `**/.DS_Store` ignored globally.
- `tmp/` and `tmp_cli/` working-tree artifacts removed.

### Removed
- All previous GitHub releases (`v1.3.0 Salem`, `v1.2.1`, `v1.2.0`, `v1.1.0`) and all version tags (`Tuscan-Blue`, `v1.0.1`, `v1.1.0`, `v1.2.0`, `v1.2.1`) wiped to start fresh from `v2.0.0`. Existing npm versions (1.0.0 → 1.2.1) left in place; users on the 1.x line are unaffected.
- `docs/rosemary-irene-dossier.md`, `docs/cursor-instructions.md`, `docs/rosemary-llm-roadmap.md`, `docs/llm-implementation-spec.md`, `docs/llm-examples.md`, `docs/migration-guide.md`, `docs/how-it-actually-works.md` — internal scratch and marketing-voice forward-looking material. Replaced by `docs/llm.md`, `docs/direction.md`, `docs/non-goals.md`.

---

## [1.2.1] - 2025-08-17 (Arp hotfix)

### Fixed
- Visualization builder now inlines dataset into scripts to avoid `data is not defined` in generated HTML.
- Repo hygiene: ignore generated HTML and temp folders (`tmp/`, `tmp_cli/`); removed previously tracked artifacts.

> Note: `1.2.1` was published to npm with three LLM source files (`src/llm/RosemaryLLM.js`, `src/llm/providers/ClaudeProvider.js`, `src/_tests_/RosemaryLLM.test.js`) and the `exports` field for `./llm` sitting uncommitted in the working tree. The published tarball advertised `require('rosemary-js/llm')` but did not contain those files. Fixed in the next release.

## [1.2.0] - 2025-08-17 (Arp) — git tag only, never published to npm

A `v1.2.0` tag exists in the git history. The corresponding tarball was **never published to npm**; the npm registry skipped from `1.1.1` to `1.2.1`. Treat `1.2.0` as superseded by `1.2.1`. Documented here so future readers understand the gap.

### Added
- `updateLeaf(id, { content, tags })` for atomic updates.
- Configurable CSV delimiter in `exportToCSV` / `importFromCSV`.
- Safe HTML rendering via `DOMPurify` + `marked` in `getLeafContentAsHTML`.
- Stable ID generation via `nanoid`-style base64url.
- API server now loads from `ROSEMARY_DATA_FILE` if provided.
- Visualization `Builder`: preset merging, `buildNetworkDataset()`, `scripts/visualize.js`.
- CLI CSV import/export commands; new CLI tests; refreshed `examples/` (botany paper network, Thailand mindmap).

### Changed
- CLI `-d/--data-file` now respected; data is loaded/saved at that path.
- Auto-save consistency: `addLeaf`, `tagLeaf`, `removeLeaf` save when `autoSave` is true.
- Fuzzy search indexes array tags correctly and returns `Leaf` items.

### Fixed
- CSV tags delimiter mismatch (export used `;`, import expected `,`) — now consistent and configurable.
- Declared missing runtime deps for API and visualization server.

### Security
- Sanitization added to Markdown-to-HTML rendering to mitigate XSS.

## [1.1.1] - 2024-10-04 — npm publish, no matching git tag

Published to npm with no corresponding `v1.1.1` git tag. The git tag set jumps `v1.1.0 → v1.2.0`. The published artifact corresponds roughly to commit `9b10cab`.

### Added
- `getLeavesByConnection` method on the `Rosemary` class.
- Method-parameter documentation across the `Rosemary` class.

## [1.1.0] - 2024-10-03 (Tuscan Blue)

### Added
- Improved error handling and robustness in data import/export.
- Tests for edge cases and error scenarios.

### Changed
- Refactored `Rosemary` constructor for better flexibility.
- `getRelatedLeaves` handles isolated leaves.
- `connectLeaves` prevents self-connections.

### Fixed
- `deleteLeaf` not properly removing connections.
- Various import/export bugs.

### Deprecated
- `1.0.0` and `1.0.1` are deprecated due to critical bugs.

## [1.0.1] - 2024 (Deprecated)

Hotfix attempt over `1.0.0`. Still has known issues. Do not use.

## [1.0.0] - 2024-10-02 (Deprecated)

Initial release. Critical bugs. Do not use.

### Added
- Core `Leaf` / `Stem` / `Rosemary` classes.
- Tagging, connections, basic search.
- JSON / CSV import-export.
- CLI.

---

## Version names

Internal codenames (Tuscan Blue, Arp, Irene, …) appear in this changelog only and are not used in marketing copy or README headers.
