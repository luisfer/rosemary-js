# AGENTS.md

Instructions for any AI agent (Cursor, Claude Code, Codex, Aider, Cline, Copilot, ChatGPT) working on `rosemary-js`.

## Project profile

- **Type:** open-source library, JavaScript (CommonJS), Node 18+, npm.
- **One-line:** A graph-shaped knowledge store: leaves (nodes), tags, typed connections, fuzzy and structural search, optional LLM context-building layer.
- **Public API:** `Rosemary` (core), `RosemaryLLM` (`require('rosemary-js/llm')`), `Builder` (`require('rosemary-js/builder')`), API server (`require('rosemary-js/api')`).
- **Test:** `npm test` (Jest).
- **Visualize:** `npm run visualize -- path/to/data.json`.
- **Release:** `npm run release -- patch|minor|major|<version>` (see `RELEASE.md`).
- **Docs:** `readme.md`, `docs/llm.md`, `docs/direction.md`, `docs/non-goals.md`, `CHANGELOG.md`.

## Voice

All user-facing copy in this project follows one register: plain, declarative, spec-sheet.

- No marketing language.
- No hype verbs (*unlock*, *supercharge*, *transform*, *level up*, *empower*, *revolutionize*).
- No "not just X, it's Y" constructions.
- No staccato closers ("Magic.", "Done.", "That simple.").
- No decorative adjectives (*seamless*, *powerful*, *intuitive*, *elegant*, *delightful*).
- No "Cultivate your knowledge" / "Let your ideas flourish" / "Growing Together" register.
- No emoji unless explicitly requested.
- No "About the Author" / personal pitch / LinkedIn-style copy.

If you cannot describe a feature without one of those, the description is the problem, not the feature. Cut.

This applies to: README, CLI output, error messages, `docs/`, commit messages, GitHub release notes, package.json `description` and `keywords`.

## Code conventions

- CommonJS, no transpile step.
- Public methods get JSDoc and a Jest test in `src/_tests_/`.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `build:`, `ci:`).
- Zero breaking changes to the v1.x `Rosemary` class API.
- Heavy/optional features (Express API, Swagger, http-server, LLM providers, embedders) belong under `optionalDependencies`. The base library and CLI must work with `npm install rosemary-js` alone.
- New files do not import from `dependencies` that aren't already present.

## Release rules

- The version in `package.json` is the single source of truth. Git tag (`v<version>`) and npm registry must always match.
- Never `npm publish` by hand. Always `npm run release` so `prepublishOnly` (`npm test && node scripts/check-release.js`) runs.
- A release commit looks like `chore(release): <version>`. The release script makes it for you.
- Update `CHANGELOG.md` *before* running `npm run release`. The pre-flight check refuses if the changelog does not mention the new version.

## Direction

`docs/direction.md` lists planned extensions (concept resolution, typed edge vocabulary, walk modes, bridge, MCP server). `docs/non-goals.md` lists what this library will not become. Read both before proposing significant new surface area.
