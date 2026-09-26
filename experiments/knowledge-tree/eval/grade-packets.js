#!/usr/bin/env node
'use strict';

// Builds two blind grading packets from runs.jsonl, with independent shuffles and labels.
// Usage: node experiments/knowledge-tree/eval/grade-packets.js <out-dir>
// Writes <out-dir>/packet-1.md and packet-2.md for the graders, and the label maps
// and the list of redactions to <out-dir>/private/, which the graders must not read.
// Answers lose any sentence that mentions notes, the tree, or a repository copy,
// so a grader cannot tell which condition produced an answer.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT = path.resolve(process.argv[2] || 'grading');
fs.mkdirSync(path.join(OUT, 'private'), { recursive: true });
const rows = fs.readFileSync(path.join(__dirname, 'runs.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(r => r.cond !== '-');
const questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf8')).questions;

const REVEAL = /notes-B|notes file|knowledge[- ]tree|\bthe tree\b|tree's|\bnotes?\b|\bstale\b|(marked|is|was) fresh|fresh (note|knowledge)|verified (by|against)|repo-[ABC]|\bI read\b|confirmed (by|from)/i;
function redact(text) {
  let t = text.replace(/\s*\(([^()]*)\)/g, (m, inner) => (REVEAL.test(inner) ? '' : m));
  const sentences = t.split(/(?<=[.!?])\s+/);
  t = sentences.filter(s => !REVEAL.test(s)).join(' ').trim();
  return t.replace(/\s+/g, ' ');
}

const redactions = [];
for (const r of rows) {
  r.clean = redact(r.answer);
  if (r.clean !== r.answer.replace(/\s+/g, ' ').trim()) redactions.push({ qid: r.qid, cond: r.cond, before: r.answer, after: r.clean });
}
fs.writeFileSync(path.join(OUT, 'private', 'redactions.json'), JSON.stringify(redactions, null, 2));

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

for (const packet of [1, 2]) {
  const map = {};
  const used = new Set();
  const lines = [
    '# Grading packet',
    '',
    'Each section has one question about a software repository, a reference answer, and several answers to grade.',
    'For some questions, the section also gives an outdated answer: what was true before a recent change to the repository.',
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
  const qs = shuffle(questions, `questions-${packet}`);
  qs.forEach((q, qi) => {
    lines.push(`## Q${qi + 1}`, '', `Question: ${q.q}`, '', `Reference answer: ${q.key}`, '');
    if (q.stale) lines.push(`Outdated answer: ${q.stale}`, '');
    const answers = shuffle(rows.filter(r => r.qid === q.id), `answers-${packet}-${q.id}`);
    for (const a of answers) {
      let label;
      do { label = crypto.randomBytes(2).toString('hex').toUpperCase(); } while (used.has(label));
      used.add(label);
      map[label] = { qid: a.qid, cond: a.cond };
      lines.push(`- ${label}: ${a.clean}`);
    }
    lines.push('');
  });
  fs.writeFileSync(path.join(OUT, `packet-${packet}.md`), lines.join('\n'));
  fs.writeFileSync(path.join(OUT, 'private', `map-${packet}.json`), JSON.stringify(map, null, 2));
  console.log(`packet ${packet}: ${Object.keys(map).length} answers, ~${Math.round(lines.join('\n').length / 4)} tokens`);
}
console.log(`redacted answers: ${redactions.length}`);
