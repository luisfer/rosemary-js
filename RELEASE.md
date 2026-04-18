# Releasing rosemary-js

Single command. Single source of truth. Same version in `package.json`, git tag, and npm registry — always.

```bash
npm run release -- patch     # 1.2.1 -> 1.2.2
npm run release -- minor     # 1.2.1 -> 1.3.0
npm run release -- major     # 1.2.1 -> 2.0.0
npm run release -- 1.4.0     # explicit
npm run release -- minor --dry-run    # show what would happen, do nothing
```

## What `npm run release` does

1. Refuses if the working tree is dirty.
2. Refuses if not on `main` (override with `--force-branch`).
3. Runs `npm test`.
4. Runs `npm version <bump>`, which bumps `package.json` and creates the matching git tag `v<version>` in one atomic commit.
5. Runs `git push --follow-tags`.
6. Runs `npm publish`, which fires `prepublishOnly` (`npm test && node scripts/check-release.js`) before uploading.

`scripts/check-release.js` is the guard. It will refuse the publish if any of these are wrong:

- working tree not clean
- `HEAD` does not match `git tag v<version>`
- tag not pushed to `origin`
- version already exists on the npm registry
- `CHANGELOG.md` does not mention the new version

## Pre-release checklist

Run through this before typing `npm run release`:

- [ ] All work is committed; `git status` is clean.
- [ ] On `main`, in sync with `origin/main`.
- [ ] `npm test` passes locally.
- [ ] `CHANGELOG.md` has a section for the new version, with `### Added`, `### Changed`, `### Fixed`, `### Security` as needed.
- [ ] README, `docs/`, and CLI help reflect any API changes.
- [ ] No `.env*` or other secrets staged.
- [ ] `npm pack --dry-run` looks right (no junk, no missing files).
- [ ] Logged in to npm: `npm whoami` returns your account.

## After release

- [ ] `npm view rosemary-js version` matches the new version.
- [ ] `git tag -l` shows the new `v<version>`.
- [ ] GitHub release notes posted (manually, or via the optional Actions workflow).

## Why this exists

History to learn from:

- `1.0.0` and `1.0.1` shipped with critical bugs and were marked deprecated.
- `1.1.0` was tagged `v1.1.0` on git but the corresponding npm publish came out as `1.1.0` and the follow-up `1.1.1` was published with no git tag. They desynced.
- `1.2.0` was tagged `v1.2.0` on git and **never published to npm**. The npm registry jumped from `1.1.1` straight to `1.2.1`. The git tag exists with no published artifact.
- `1.2.1` shipped while three new LLM source files and a `package.json` `exports` field sat uncommitted in the working tree. The published tarball advertised features (`require('rosemary-js/llm')`) it did not contain.

`scripts/release.js` and `scripts/check-release.js` exist so this never happens again.

## Recovery

- **Wrong version published?** You have ~72 hours to `npm unpublish rosemary-js@<version>`. After that, npm refuses unless no other packages depend on it. The clean fix is to publish a corrected new version.
- **Tag and registry out of sync?** Re-run `check-release.js`; it tells you exactly which side is wrong.
- **Forgot to push the tag?** `git push origin v<version>`.

## Optional: GitHub Actions

`.github/workflows/release.yml` will publish to npm when a `v*` tag is pushed, gated by an `NPM_TOKEN` repository secret. It is disabled by default (the file ships with `if: false` on the publish job). To enable: remove that line and add `NPM_TOKEN` under repo settings → Secrets and variables → Actions.

When enabled, the workflow becomes the one publishing to npm, and `npm run release` should be run with `--no-publish` (TODO if/when enabled). Until then, `npm run release` does it all locally.
