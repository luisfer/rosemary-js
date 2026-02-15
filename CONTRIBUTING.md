# Contributing to Rosemary.js

Thanks for contributing.

## Reporting issues

- Search existing issues before opening a new one.
- Include reproduction steps, expected behavior, and actual behavior.
- For bugs, include Node version and OS details.

## Development setup

```bash
npm install
npm test
```

## Branching and pull requests

1. Create a feature branch from the latest `main`.
2. Keep changes focused and include tests when relevant.
3. Update documentation when behavior or interfaces change.
4. Open a PR with:
   - problem statement,
   - implementation notes,
   - test evidence.

## Testing expectations

- Run `npm test` before opening a PR.
- If you change CLI behavior, include CLI-oriented test coverage.
- If you change docs commands/snippets, verify they run as written.

## Release-related changes

For version/release changes, update:

- `CHANGELOG.md`
- package version metadata
- any affected docs (`readme.md`, docs/)

