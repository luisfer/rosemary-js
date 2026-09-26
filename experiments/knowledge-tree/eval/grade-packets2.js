#!/usr/bin/env node
'use strict';

// Builds two blind grading packets for experiments 2 and 3.
// Usage: node experiments/knowledge-tree/eval/grade-packets2.js <out-dir> [runs file]
// The runs file defaults to runs2.jsonl; experiment 3 uses runs3.jsonl.
// One section per question and repository state, each with its own reference answer.
// Writes <out-dir>/packet-1.md and packet-2.md, and the label maps and the list of
// redactions to <out-dir>/private/, which the graders must not read.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT = path.resolve(process.argv[2] || 'grading-2');
fs.mkdirSync(path.join(OUT, 'private'), { recursive: true });
const rows = fs.readFileSync(path.join(__dirname, process.argv[3] || 'runs2.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
const { questions } = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions2.json'), 'utf8'));

const REVEAL = /notes\.md|notes file|knowledge[- ]tree|\bthe tree\b|tree's|\bnotes?\b|\bstale\b|(marked|is|was) fresh|fresh (note|knowledge)|verified (by|against)|repo-[ABC]|\bI read\b|confirmed (by|from)|\bcache|standing|did not rely|project memory|snapshot|this repo copy/i;
// Phrases that would trip the filter below without saying anything about notes.
const NEUTRAL = [
  [/\bthe tree is (still )?clean/g, 'the working tree is $1clean'],
  [/In this repo-B snapshot, /g, ''],
  [/left stale/g, 'left out of date'],
  [/\bNote that /g, 'Also, ']
];
function redact(text) {
  let t = NEUTRAL.reduce((acc, [from, to]) => acc.replace(from, to), text);
  t = t.replace(/\s*\(([^()]*)\)/g, (m, inner) => (REVEAL.test(inner) ? '' : m));
  t = t.split(/(?<=[.!?])\s+/).filter(s => !REVEAL.test(s)).join(' ').trim();
  return t.replace(/\s+/g, ' ');
}

function shuffle(arr, seed) {
  const a = arr.slice();
  let s = crypto.createHash('sha256').update(seed).digest();
  for (let i = a.length - 1; i > 0; i--) {
    s = crypto.createHash('sha256').update(s).digest();
    const j = s.readUInt32BE(0) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const redactions = [];
for (const r of rows) {
  r.clean = redact(r.answer);
  if (r.clean !== r.answer.replace(/\s+/g, ' ').trim()) redactions.push({ qid: r.qid, state: r.state, cond: r.cond, before: r.answer, after: r.clean });
}
fs.writeFileSync(path.join(OUT, 'private', 'redactions.json'), JSON.stringify(redactions, null, 2));

const sections = [];
for (const q of questions) {
  for (const state of ['s0', 's1']) {
    const key = state === 's1' && q.s1 !== 'Same as s0.' ? q.s1 : q.s0;
    const outdated = state === 's1' && q.s1Note === 'changed' ? q.s0 : null;
    sections.push({ q, state, key, outdated });
  }
}

for (const packet of [1, 2]) {
  const map = {};
  const used = new Set();
  const lines = [
    '# Grading packet',
    '',
    'Each section has one question about a software repository, the version of the repository the answers are about, a reference answer, and several answers to grade.',
    'Two versions of the repository exist: version 1 and version 2 (version 2 has a few more changes). For some version 2 questions, the section also gives an outdated answer: what was true in version 1.',
    '',
    'Grades:',
    '- correct: every point the question asks for matches the reference. Extra detail is fine if it is true.',
    '- partial: nothing the question asks for is wrong, but part of it is missing.',
    '- stale: the answer states the outdated answer, fully or in part.',
    '- incorrect: a point the question asks for is wrong, and not because of the outdated answer.',
    '',
    'Also set extra_error to true when an answer adds a detail that the question did not ask for and that is false.',
    ''
  ];
  let n = 0;
  for (const s of shuffle(sections, `sections-${packet}`)) {
    const version = s.state === 's0' ? 1 : 2;
    if (!rows.some(r => r.qid === s.q.id && r.state === s.state)) continue;
    n++;
    lines.push(`## Q${n} (version ${version})`, '', `Question: ${s.q.q}`, '', `Reference answer: ${s.key}`, '');
    if (s.outdated) lines.push(`Outdated answer: ${s.outdated}`, '');
    const answers = shuffle(rows.filter(r => r.qid === s.q.id && r.state === s.state), `answers-${packet}-${s.q.id}-${s.state}`);
    if (!answers.length) continue;
    for (const a of answers) {
      let label;
      do { label = crypto.randomBytes(2).toString('hex').toUpperCase(); } while (used.has(label));
      used.add(label);
      map[label] = { qid: a.qid, state: a.state, cond: a.cond };
      lines.push(`- ${label}: ${a.clean}`);
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(OUT, `packet-${packet}.md`), lines.join('\n'));
  fs.writeFileSync(path.join(OUT, 'private', `map-${packet}.json`), JSON.stringify(map, null, 2));
  console.log(`packet ${packet}: ${Object.keys(map).length} answers, ~${Math.round(lines.join('\n').length / 4)} tokens`);
}
console.log(`redacted answers: ${redactions.length}`);
