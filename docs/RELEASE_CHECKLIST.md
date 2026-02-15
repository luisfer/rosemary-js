# Release Checklist (GitHub + npm)

Use this checklist before publishing a new version.

## 1) Version and changelog

- [ ] Update `package.json` version.
- [ ] Ensure `package-lock.json` version metadata matches.
- [ ] Add release entry to `CHANGELOG.md` with factual `Added/Changed/Fixed/Security` items.
- [ ] Verify codename and date are correct.

## 2) Test and validation

- [ ] Install dependencies with `npm ci`.
- [ ] Run tests: `npm run test:ci`.
- [ ] Run documentation command checks (examples and README snippets used in release notes).
- [ ] Validate no broken import paths or missing referenced files.

## 3) Packaging checks

- [ ] Run `npm run pack:dry-run`.
- [ ] Inspect packed file list and verify expected artifacts only.
- [ ] Confirm `files` allowlist in `package.json` is correct.

## 4) GitHub release preparation

- [ ] Ensure CI is green on the release commit.
- [ ] Create tag: `v<version>`.
- [ ] Draft GitHub release notes from `CHANGELOG.md` entry.
- [ ] Include upgrade notes and backward compatibility statement.

## 5) npm publication

- [ ] Authenticate npm account with publish permissions.
- [ ] Publish package: `npm publish`.
- [ ] Verify package page version and README rendering.

## 6) Post-release verification

- [ ] In a clean directory: `npm install rosemary-js@<version>`.
- [ ] Run a quick API smoke check (`addLeaf` / `getLeafById`).
- [ ] Run a quick CLI smoke check (`rosemary report` with `-d` file).
- [ ] Confirm no immediate rollback issues.

