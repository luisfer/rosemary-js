# Contributing

Thank you for considering a contribution. Read this file end-to-end before opening a PR.

## Setup

```bash
git clone https://github.com/luisfer/rosemary-js.git
cd rosemary-js
nvm use            # uses .nvmrc (Node 20)
npm install
npm test
```

Requires Node 20 or 22. Older Node versions are not supported.

## What lives where

- `src/` — library source (`Rosemary.js`, `cli.js`, `Builder.js`, `api.js`, `llm/`).
- `src/_tests_/` — Jest tests. Every public method has one.
- `docs/` — `llm.md`, `direction.md`, `non-goals.md`. Read `direction.md` before proposing significant new surface area.
- `examples/` — runnable `node examples/<file>.js`.
- `scripts/` — `release.js`, `check-release.js`, `visualize.js`.
- `AGENTS.md` — instructions for AI tools and the voice contract.
- `RELEASE.md` — release process, run by `npm run release`. Do not bypass it.

## Voice

All user-facing text (README, CLI output, error messages, docs, commit messages, GitHub release notes) follows the spec-sheet voice in `AGENTS.md`. Plain, declarative, no marketing copy, no decorative emoji, no hype verbs.

If a description cannot be written without `unlock`, `supercharge`, `seamless`, etc., the description is the problem, not the feature. Cut.

## Branching

Trunk-based on `main`. Open a PR from a topic branch:

```bash
git checkout -b feat/short-description
# or fix/short-description, docs/short-description, refactor/short-description
```

## Commits

Conventional Commits, lower-case subject, no trailing period:

```
<type>(<scope>): <subject>

<body, wrapped at 72 chars, present tense, no marketing>
```

Allowed types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`.

A breaking change goes in the body as `BREAKING CHANGE: <description>` and triggers a major version. Breaking changes to the v1.x `Rosemary` class API are not accepted.

## Pull requests

- Tests pass locally (`npm test`).
- Public methods have a Jest test in `src/_tests_/`.
- New runtime imports do not pull from `optionalDependencies`. The base library and CLI must work after `npm install rosemary-js` alone.
- README, `docs/`, and CLI help reflect any API changes.
- `CHANGELOG.md` updated under `## Unreleased`.
- No `.env*`, no API keys, no `.DS_Store`, no `tmp/` artifacts in the diff.

The repo runs CI on Node 20 and 22 for every PR. Both must pass before review.

## Releases

Maintainers only. The version in `package.json` is the single source of truth. Git tag `v<version>` and the npm registry must match. See `RELEASE.md`. Use:

```bash
npm run release -- patch    # or minor, major, or explicit x.y.z
```

Do not run `npm publish` directly. The release script and `prepublishOnly` guard exist precisely to prevent the desync incidents described in `RELEASE.md`.

## Security

Vulnerabilities go to the email in `SECURITY.md`, not to public issues.

## Issues

Bug reports and feature requests: <https://github.com/luisfer/rosemary-js/issues>. Include a minimal reproduction for bugs.
