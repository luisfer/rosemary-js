#!/usr/bin/env node
'use strict';

// Builds the three repository copies for the knowledge-tree experiment.
// Usage: node experiments/knowledge-tree/eval/setup.js <out-dir>
//
// 1. Copy the repository at HEAD (without experiments/) and write the notes.
// 2. Apply eight code changes the notes do not know about.
// 3. repo-A: the changed repository. repo-B: the same (notes go in the prompt).
//    repo-C: the same plus .rosemary/ (the tree and the CLI), read-only.
// 4. Write notes.md (condition B prompt) and map.txt (condition C prompt).

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Tree, tokens } = require('../grow');
const { writeNotes } = require('../notes');

const out = path.resolve(process.argv[2] || 'knowledge-tree-eval');
const repo = execSync('git rev-parse --show-toplevel', { cwd: __dirname, encoding: 'utf8' }).trim();
const base = path.join(out, 'base');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(base, { recursive: true });
execSync(`git -C "${repo}" archive --format=tar HEAD | tar -x -C "${base}"`);
fs.rmSync(path.join(base, 'experiments'), { recursive: true, force: true });

// Notes are written against the unchanged files.
const tree = new Tree(base);
writeNotes(tree);

// Condition B: every note as one Markdown document, with no freshness information.
const nodes = tree.data.nodes;
const md = ['# Notes about this repository', ''];
const walk = (id, depth) => {
  const n = nodes[id];
  md.push(`${'#'.repeat(Math.min(depth + 2, 6))} ${n.title}`, '', n.gist, '');
  if (n.body) md.push(n.body, '');
  for (const l of tree.data.links.filter(link => link.from === id)) {
    md.push(`Link: ${l.type} ${nodes[l.to].title}${l.note ? ` (${l.note})` : ''}`, '');
  }
  for (const cid of tree.children(id)) walk(cid, depth + 1);
};
for (const id of Object.keys(nodes).filter(k => nodes[k].parent === null)) walk(id, 0);
fs.writeFileSync(path.join(out, 'notes.md'), md.join('\n'));

// Eight changes made after the notes were written.
const edit = (rel, anchor, replacement) => {
  const file = path.join(base, rel);
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(anchor)) throw new Error(`setup: anchor not found in ${rel}`);
  fs.writeFileSync(file, text.replace(anchor, replacement));
};
edit('scripts/release.js', '// 3. tests first (fast feedback before bumping)', `// 3. CHANGELOG must have entries under ## [Unreleased] before anything is tagged
const changelog = fs.readFileSync(path.resolve(__dirname, '..', 'CHANGELOG.md'), 'utf8');
const unreleased = changelog.split(/^## /m).find(section => section.startsWith('[Unreleased]'));
if (!unreleased || !/^\\s*- /m.test(unreleased)) {
  fail('CHANGELOG.md needs entries under ## [Unreleased] before a release.');
}

// 4. tests first (fast feedback before bumping)`);
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
fs.mkdirSync(path.join(base, 'test/integration'), { recursive: true });
fs.writeFileSync(path.join(base, 'test/integration/roundtrip.test.js'), `const Rosemary = require('../../src/Rosemary');

test('JSON round trip keeps connections', () => {
  const brain = new Rosemary({ autoSave: false });
  const a = brain.addLeaf('A');
  const b = brain.addLeaf('B');
  brain.connectLeaves(a, b, 'implies');
  const copy = new Rosemary({ autoSave: false });
  copy.importData(JSON.stringify(brain.createExportData()));
  expect(copy.getRelatedLeaves(a).map(l => l.id)).toEqual([b]);
});
`);
edit('src/llm/providers/ClaudeProvider.js', 'this.maxTokens = options.maxTokens || 1024;', 'this.maxTokens = options.maxTokens || 4096;');
edit('src/Rosemary.js', "keys: ['content', 'tags'],\n      threshold: 0.4,", "keys: ['content', 'tags'],\n      threshold: 0.3,");
edit('src/edges.js', "  AKA: 'aka'\n});", "  AKA: 'aka',\n  SUPERSEDES: 'supersedes'\n});");
edit('src/edges.js', '  RESERVED_EDGE_TYPES.AKA\n]);', '  RESERVED_EDGE_TYPES.AKA,\n  RESERVED_EDGE_TYPES.SUPERSEDES\n]);');
edit('package.json', '"node": ">=20"', '"node": ">=22"');
edit('src/cli.js', '// Command to search for leaves', `// Command to print counts of leaves, tags, and connections
program
  .command('stats')
  .description('Print the number of leaves, tags, and connections')
  .action(() => {
    brain.logDataSummary();
  });

// Command to search for leaves`);

// The three copies.
const copy = (name, withTree) => {
  const dir = path.join(out, name);
  fs.cpSync(base, dir, { recursive: true, filter: src => withTree || !src.split(path.sep).includes('.rosemary') });
  if (withTree) {
    fs.copyFileSync(path.join(__dirname, '..', 'grow.js'), path.join(dir, '.rosemary', 'grow.js'));
    fs.chmodSync(path.join(dir, '.rosemary', 'tree.json'), 0o444);
  }
  return dir;
};
copy('repo-A', false);
copy('repo-B', false);
const repoC = copy('repo-C', true);

// Condition C: the start-of-session map, computed against the changed files.
const map = new Tree(repoC).read(400);
fs.writeFileSync(path.join(out, 'map.txt'), map);
const { ready, later, fresh } = new Tree(repoC).todo();

console.log(JSON.stringify({
  out,
  notesMdTokens: tokens(fs.readFileSync(path.join(out, 'notes.md'), 'utf8')),
  mapTokens: tokens(map),
  treeInC: { fresh, stale: ready.length, waiting: later.length, staleIds: ready.map(t => t.id) }
}, null, 2));
