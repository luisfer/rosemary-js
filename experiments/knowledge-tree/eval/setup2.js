#!/usr/bin/env node
'use strict';

// Builds the repository copies for experiment 2.
// Usage: node experiments/knowledge-tree/eval/setup2.js <out-dir>
//
// 1. Copy the repository at HEAD (without experiments/), write the notes from
//    ../notes.js and the stored answers from answers2.js.
// 2. s0/: the repository as the notes describe it. Every note is fresh.
// 3. s1/: the same after three changes the notes do not know about.
// 4. In each state: repo-A and repo-B are the plain repository, and repo-C also has
//    .rosemary/ (the tree and the CLI), read-only. notes.md holds every note for B.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Tree, tokens } = require('../grow');
const { writeNotes } = require('../notes');
const { writeAnswers } = require('./answers2');

const out = path.resolve(process.argv[2] || 'knowledge-tree-eval-2');
const repo = execSync('git rev-parse --show-toplevel', { cwd: __dirname, encoding: 'utf8' }).trim();
const base = path.join(out, 'base');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(base, { recursive: true });
execSync(`git -C "${repo}" archive --format=tar HEAD | tar -x -C "${base}"`);
fs.rmSync(path.join(base, 'experiments'), { recursive: true, force: true });

const tree = new Tree(base);
writeNotes(tree);
writeAnswers(tree);

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

const copies = (state) => {
  for (const name of ['repo-A', 'repo-B', 'repo-C']) {
    const withTree = name === 'repo-C';
    const dir = path.join(out, state, name);
    fs.cpSync(base, dir, { recursive: true, filter: src => withTree || !src.split(path.sep).includes('.rosemary') });
    if (withTree) {
      fs.copyFileSync(path.join(__dirname, '..', 'grow.js'), path.join(dir, '.rosemary', 'grow.js'));
      fs.chmodSync(path.join(dir, '.rosemary', 'tree.json'), 0o444);
    }
  }
  const repoC = path.join(out, state, 'repo-C');
  fs.writeFileSync(path.join(out, state, 'map.txt'), new Tree(repoC).read(400));
  const answers = Object.keys(nodes).filter(id => id.startsWith('q:'));
  return Object.fromEntries(answers.map(id => [id, new Tree(repoC).status(id).state]));
};

const s0 = copies('s0');

// Three changes made after the notes were written.
const edit = (rel, anchor, replacement) => {
  const file = path.join(base, rel);
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(anchor)) throw new Error(`setup2: anchor not found in ${rel}`);
  fs.writeFileSync(file, text.replace(anchor, replacement));
};
// 1. A new method that changes tags without saving, declared in index.d.ts, with no test.
edit('src/Rosemary.js', '  /**\n   * Retrieves all tags in the Rosemary instance.', `  /**
   * Renames a tag on every leaf that has it.
   * @param {string} oldTag - The tag to rename.
   * @param {string} newTag - The new tag name.
   * @returns {number} The number of leaves changed.
   */
  renameTag(oldTag, newTag) {
    let changed = 0;
    for (const leaf of this.leaves.values()) {
      if (leaf.hasTag(oldTag)) {
        leaf.removeTag(oldTag);
        leaf.addTag(newTag);
        changed++;
      }
    }
    this.tags.delete(oldTag);
    if (changed > 0) this.tags.add(newTag);
    return changed;
  }

  /**
   * Retrieves all tags in the Rosemary instance.`);
edit('index.d.ts', '  tagLeaf(leafId: string, ...tags: string[]): void;\n', '  tagLeaf(leafId: string, ...tags: string[]): void;\n  renameTag(oldTag: string, newTag: string): number;\n');
// 2. A CLI command that the README does not list.
edit('src/cli.js', '// Command to search for leaves', `// Command to print counts of leaves, tags, and connections
program
  .command('stats')
  .description('Print the number of leaves, tags, and connections')
  .action(() => {
    brain.logDataSummary();
  });

// Command to search for leaves`);
// 3. A test in a new folder that calls exportToJSON and updateLeaf.
fs.mkdirSync(path.join(base, 'test/integration'), { recursive: true });
fs.writeFileSync(path.join(base, 'test/integration/export.test.js'), `const fs = require('fs');
const os = require('os');
const path = require('path');
const Rosemary = require('../../src/Rosemary');

test('exportToJSON writes the updated leaf', () => {
  const brain = new Rosemary({ autoSave: false });
  const id = brain.addLeaf('A', ['x']);
  brain.updateLeaf(id, { content: 'B' });
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rosemary-')), 'out.json');
  brain.exportToJSON(file);
  expect(JSON.parse(fs.readFileSync(file, 'utf8')).leaves[0].content).toBe('B');
});
`);

const s1 = copies('s1');
fs.rmSync(base, { recursive: true, force: true });

console.log(JSON.stringify({
  out,
  notesMdTokens: tokens(fs.readFileSync(path.join(out, 'notes.md'), 'utf8')),
  mapTokens: tokens(fs.readFileSync(path.join(out, 's0', 'map.txt'), 'utf8')),
  answers: Object.fromEntries(Object.keys(s0).map(id => [id, { s0: s0[id], s1: s1[id] }]))
}, null, 2));
