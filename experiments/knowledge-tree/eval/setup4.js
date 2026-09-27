#!/usr/bin/env node
'use strict';

// Experiment 4: agents keep their own memory across twelve sessions while the code changes.
// Usage:
//   node experiments/knowledge-tree/eval/setup4.js <out-dir>                  build everything
//   node experiments/knowledge-tree/eval/setup4.js <out-dir> --apply c1      apply a change to every timeline
//   node experiments/knowledge-tree/eval/setup4.js <out-dir> --record <tag>  append the memory state to memory.jsonl
//
// <out-dir>/A1..A3, B1..B3, C1..C3 each hold one timeline's repository copy in repo/.
// A: no memory. B: NOTES.md in the repository root, which agents maintain.
// C: the knowledge tree in .rosemary/ (starts empty), which agents maintain.
// <out-dir>/versions/t0..t3 are plain copies of each repository state, for the graders.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Tree } = require('../grow');
const { applyChange } = require('./changes');

const out = path.resolve(process.argv[2] || 'knowledge-tree-eval-4');
const TIMELINES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
const repoOf = t => path.join(out, t, 'repo');
const flag = name => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
};

function build() {
  const repo = execSync('git rev-parse --show-toplevel', { cwd: __dirname, encoding: 'utf8' }).trim();
  fs.rmSync(out, { recursive: true, force: true });
  const base = path.join(out, 'base');
  fs.mkdirSync(base, { recursive: true });
  execSync(`git -C "${repo}" archive --format=tar HEAD | tar -x -C "${base}"`);
  fs.rmSync(path.join(base, 'experiments'), { recursive: true, force: true });

  for (const t of TIMELINES) {
    const dir = repoOf(t);
    fs.cpSync(base, dir, { recursive: true });
    if (t.startsWith('B')) fs.writeFileSync(path.join(dir, 'NOTES.md'), '# Notes\n\nNotes kept by agents working on this repository.\n');
    if (t.startsWith('C')) {
      fs.mkdirSync(path.join(dir, '.rosemary'), { recursive: true });
      fs.copyFileSync(path.join(__dirname, '..', 'grow.js'), path.join(dir, '.rosemary', 'grow.js'));
    }
  }
  fs.mkdirSync(path.join(out, 'answers'), { recursive: true });

  // Plain copies of each state for the graders, and a check of the computable keys.
  const states = [['t0', []], ['t1', ['c1']], ['t2', ['c1', 'c2']], ['t3', ['c1', 'c2', 'c3']]];
  for (const [state, changes] of states) {
    const dir = path.join(out, 'versions', state);
    fs.cpSync(base, dir, { recursive: true });
    for (const c of changes) applyChange(dir, c);
    const dts = fs.readFileSync(path.join(dir, 'index.d.ts'), 'utf8');
    const declared = [...dts.slice(dts.indexOf('declare class Rosemary')).matchAll(/^ {2}([a-zA-Z_]+)\(/gm)].map(m => m[1]).filter(n => n !== 'constructor');
    const tests = fs.globSync('**/*.test.js', { cwd: dir }).filter(f => !f.includes('node_modules'));
    const testText = tests.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    const untested = declared.filter(m => !new RegExp(`\\.\\s*${m}\\s*\\(`).test(testText));
    const commands = [...fs.readFileSync(path.join(dir, 'src/cli.js'), 'utf8').matchAll(/\.command\('([a-z-]+)/g)].map(m => m[1]);
    const readme = fs.readFileSync(path.join(dir, 'readme.md'), 'utf8');
    const section = readme.slice(readme.indexOf('## CLI'), readme.indexOf('## Visualization'));
    const listed = [...section.matchAll(/^rosemary ([a-z-]+)/gm)].map(m => m[1]);
    const renameTag = fs.readFileSync(path.join(dir, 'src/Rosemary.js'), 'utf8').includes('renameTag(oldTag, newTag) {');
    console.log(`${state}: untested ${untested.length} (${untested.join(', ')}); not in README: ${commands.filter(c => !listed.includes(c)).join(', ')}; renameTag: ${renameTag}`);
  }
  fs.rmSync(base, { recursive: true, force: true });
  console.log(`built ${TIMELINES.length} timelines in ${out}`);
}

function apply(change) {
  for (const t of TIMELINES) applyChange(repoOf(t), change);
  console.log(`applied ${change} to ${TIMELINES.length} timelines`);
}

// What each memory holds at this point: stored answers with sources and status, or the notes file.
function record(tag) {
  const rows = [];
  for (const t of TIMELINES) {
    const dir = repoOf(t);
    if (t.startsWith('B')) {
      const text = fs.readFileSync(path.join(dir, 'NOTES.md'), 'utf8');
      rows.push({ tag, timeline: t, notesChars: text.length, notes: text });
    }
    if (t.startsWith('C')) {
      const tree = new Tree(dir);
      const notes = Object.entries(tree.data.nodes).map(([id, n]) => ({
        id, title: n.title, gist: n.gist, sources: Object.keys(n.sources), state: tree.status(id).state
      }));
      rows.push({ tag, timeline: t, notes });
    }
  }
  fs.appendFileSync(path.join(out, 'memory.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  for (const r of rows) {
    if (r.notes && Array.isArray(r.notes)) console.log(`${tag} ${r.timeline}: ${r.notes.map(n => `${n.id} [${n.state}] <- ${n.sources.join(' ')}`).join(' | ') || 'empty'}`);
    else console.log(`${tag} ${r.timeline}: NOTES.md ${r.notesChars} chars`);
  }
}

if (flag('apply')) apply(flag('apply'));
else if (flag('record')) record(flag('record'));
else build();
