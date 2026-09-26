#!/usr/bin/env node
'use strict';

// Runs the knowledge-tree scenario on a temporary copy of this repository:
// write notes, change code three times, and print what the tree reports.
// Usage: node experiments/knowledge-tree/demo.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { Tree, tokens } = require('./grow');
const { writeNotes } = require('./notes');

const repo = execSync('git rev-parse --show-toplevel', { cwd: __dirname, encoding: 'utf8' }).trim();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-tree-'));
execSync(`git -C "${repo}" archive --format=tar HEAD | tar -x -C "${dir}"`);

const tree = () => new Tree(dir);
const say = (text) => process.stdout.write(`${text}\n`);
const heading = (text) => say(`\n## ${text}\n`);
const todo = () => {
  const { ready, later, fresh } = tree().todo();
  say(`${fresh} fresh, ${ready.length} to refresh now, ${later.length} to check after that`);
  ready.forEach((t, i) => say(`  ${i + 1}. ${t.id}: ${t.reasons.join('; ')}`));
  if (later.length) say(`  then: ${later.map(t => t.id).join(', ')}`);
};
const edit = (rel, anchor, replacement) => {
  const file = path.join(dir, rel);
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(anchor)) throw new Error(`demo: anchor not found in ${rel}; update demo.js`);
  fs.writeFileSync(file, text.replace(anchor, replacement));
};

heading('Notes written after reading the repository');
writeNotes(tree());
const sizes = tree().sizes();
say(`${sizes.notes} notes over ${sizes.sourceFiles} files. Sources: ~${sizes.sourceTokens} tokens. All notes: ~${sizes.gistTokens + sizes.bodyTokens} tokens.`);
todo();

heading('What an agent reads at the start of a session (budget: 400 tokens)');
const map = tree().read(400);
say(`${map}\n(~${tokens(map)} tokens)`);

heading('Change 1: a teammate adds Stem#removeConnection');
edit('src/Stem.js', '  /**\n   * Checks if a connection exists between two leaves.', `  /**
   * Removes the connection between two leaves in both directions.
   * @param {string} leafId1 - ID of the first leaf.
   * @param {string} leafId2 - ID of the second leaf.
   * @returns {boolean} True if a connection was removed.
   */
  removeConnection(leafId1, leafId2) {
    let removed = false;
    for (const [from, to] of [[leafId1, leafId2], [leafId2, leafId1]]) {
      const map = this.connections.get(from);
      if (map && map.delete(to)) removed = true;
      if (map && map.size === 0) this.connections.delete(from);
    }
    return removed;
  }

  /**
   * Checks if a connection exists between two leaves.`);
todo();
say('\nThe agent reads src/Stem.js again and rewrites its note:');
tree().write('file:src/Stem.js', {
  sources: ['src/Stem.js'],
  by: 'claude (agent)',
  gist: 'Edge store: Map from → Map to → type, so one relationship type per ordered pair; edges can be removed per pair.',
  body: [
    '`addConnection` writes both directions; `addDirectedConnection` writes one. A second type on the same pair replaces the first.',
    '`removeConnection(a, b)` deletes the pair in both directions, drops empty maps, and returns whether anything was removed.',
    '`toJSON` emits `{from, to, type, directed}` and treats a pair as undirected when both directions carry the same type. `fromJSON` also reads the legacy `{leafId, connections}` shape.',
    '`getTotalConnections` divides by 2, which is wrong once directed edges exist.'
  ].join('\n')
});
todo();
say('\nThe src/ summary and the stored answer about saving connections still hold, so the agent confirms them:');
tree().confirm('dir:src', 'claude (agent)');
tree().confirm('q:persistence', 'claude (agent)');
todo();
say('The project overview was never touched: confirming src/ left its text unchanged, so nothing above it went stale.');

heading('Change 2: the release script now checks the CHANGELOG before tagging');
edit('scripts/release.js', '// 3. tests first (fast feedback before bumping)', `// 3. CHANGELOG must have entries under ## [Unreleased] before anything is tagged
const changelog = fs.readFileSync(path.resolve(__dirname, '..', 'CHANGELOG.md'), 'utf8');
const unreleased = changelog.split(/^## /m).find(section => section.startsWith('[Unreleased]'));
if (!unreleased || !/^\\s*- /m.test(unreleased)) {
  fail('CHANGELOG.md needs entries under ## [Unreleased] before a release.');
}

// 4. tests first (fast feedback before bumping)`);
todo();
tree().write('file:scripts/release.js', {
  sources: ['scripts/release.js'],
  by: 'claude (agent)',
  gist: 'One-command release: checks tree, branch, and CHANGELOG entries, runs tests, bumps and tags, pushes, then publishes.',
  body: 'Accepts patch, minor, major, pre* or an explicit version. Refuses unless `CHANGELOG.md` has entries under `## [Unreleased]`, before tests or tagging. `npm version` creates the commit and tag; `git push --follow-tags` publishes the tag; `npm publish` runs `prepublishOnly` for the registry checks.'
});
say('\nAfter the agent rewrites the release.js note:');
todo();
say('\nThe stored answer as it stands now. It is no longer true, and the tree says so:\n');
say(tree().expand('q:release').split('\n').slice(0, 4).join('\n'));
tree().write('q:release', {
  uses: ['file:scripts/release.js', 'file:scripts/check-release.js'],
  by: 'claude (agent)',
  gist: 'Tree, branch, and CHANGELOG checks, tests, bump and tag, push, publish; a missing CHANGELOG entry now stops it before tagging.',
  body: '1. clean tree 2. on main 3. CHANGELOG has entries under ## [Unreleased] 4. npm test 5. npm version (commit and tag) 6. git push --follow-tags 7. npm publish, whose prepublishOnly runs the tests and check-release.js.'
});
tree().confirm('dir:scripts', 'claude (agent)');
say('\nAfter the answer is rewritten and scripts/ is confirmed:');
todo();
say('\nWhy the answer can be trusted now:\n');
say(tree().why('q:release'));

heading('Change 3: integration tests are added in a new folder; no existing file changes');
fs.mkdirSync(path.join(dir, 'test/integration'), { recursive: true });
fs.writeFileSync(path.join(dir, 'test/integration/roundtrip.test.js'), "test('round trip', () => {});\n");
todo();
say('The answer "There are no tests outside src/_tests_/" depends on the result of a file search, not on one file.');

heading('Cost of one question');
const read = ['scripts/release.js', 'scripts/check-release.js', 'RELEASE.md']
  .reduce((sum, rel) => sum + tokens(fs.readFileSync(path.join(dir, rel), 'utf8')), 0);
const answer = tree().node('q:release');
say(`"What happens, in order, when a release runs?" From the files: ~${read} tokens of reading. From the stored answer: ~${tokens(`${answer.title} ${answer.gist} ${answer.body}`)} tokens, checked against the current files.`);

fs.rmSync(dir, { recursive: true, force: true });
