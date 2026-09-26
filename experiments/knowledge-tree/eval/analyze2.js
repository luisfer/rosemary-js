#!/usr/bin/env node
'use strict';

// Summarizes experiment 2 as Markdown tables.
// Usage: node experiments/knowledge-tree/eval/analyze2.js
//
// Reads runs2.jsonl, questions2.json, and grades2.json (final grade per question,
// state, and condition) from this directory.

const fs = require('fs');
const path = require('path');

const here = __dirname;
const runs = fs.readFileSync(path.join(here, 'runs2.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
const { questions } = JSON.parse(fs.readFileSync(path.join(here, 'questions2.json'), 'utf8'));
const gradesFile = path.join(here, 'grades2.json');
const grades = fs.existsSync(gradesFile) ? JSON.parse(fs.readFileSync(gradesFile, 'utf8')).grades : [];

const CONDS = ['A', 'B2', 'C2'];
const STATES = [
  { id: 's0', name: 's0: every note fresh' },
  { id: 's1', name: 's1: after three changes' }
];
const GROUPS = [
  { name: 'Answer changed, note stale (3)', test: q => q.s1Note === 'changed' },
  { name: 'Answer unchanged, note stale (2)', test: q => q.s1Note === 'touched' },
  { name: 'Note fresh (3)', test: q => q.s1Note === 'fresh' }
];

const run = (qid, state, cond) => {
  const r = runs.find(x => x.qid === qid && x.state === state && x.cond === cond);
  if (!r) throw new Error(`missing run ${qid} ${state} ${cond}`);
  return r;
};
const calls = r => r.tool_uses - 1; // the last tool use hands the answer back
const readRepo = r => r.sources.split(',').map(s => s.trim()).filter(s => /repo-[ABC]\//.test(s)).length;
const gradeOf = (qid, state, cond) => (grades.find(g => g.qid === qid && g.state === state && g.cond === cond) || {}).grade;
const overA = (q, state, cond) => run(q.id, state, cond).tokens - run(q.id, state, 'A').tokens;

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmt = n => Math.round(n).toLocaleString('en-US');
const signed = n => `${n >= 0 ? '+' : ''}${fmt(n)}`;
const fmt1 = n => n.toFixed(1);

function bootstrap(diffs, reps = 10000) {
  let seed = 20260926;
  const rand = () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const means = [];
  for (let i = 0; i < reps; i++) {
    let sum = 0;
    for (let j = 0; j < diffs.length; j++) sum += diffs[Math.floor(rand() * diffs.length)];
    means.push(sum / diffs.length);
  }
  means.sort((a, b) => a - b);
  return [means[Math.floor(reps * 0.025)], means[Math.floor(reps * 0.975)]];
}

const out = [];
const table = (head, rows) => {
  out.push(`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`);
  for (const row of rows) out.push(`| ${row.join(' | ')} |`);
  out.push('');
};

out.push('### By state and condition (8 questions each)', '');
table(
  ['State', 'Condition', 'Tokens, mean', 'Over A, mean', 'Tool calls, mean', 'Seconds, mean', 'Runs that read no repository file', 'Correct', 'Partial', 'Stale', 'Incorrect'],
  STATES.flatMap(s => CONDS.map(cond => {
    const rs = questions.map(q => run(q.id, s.id, cond));
    const count = g => questions.filter(q => gradeOf(q.id, s.id, cond) === g).length;
    return [s.id, cond, fmt(mean(rs.map(r => r.tokens))), cond === 'A' ? '-' : signed(mean(questions.map(q => overA(q, s.id, cond)))),
      fmt1(mean(rs.map(calls))), fmt1(mean(rs.map(r => r.ms / 1000))), String(rs.filter(r => readRepo(r) === 0).length),
      ...['correct', 'partial', 'stale', 'incorrect'].map(g => (grades.length ? String(count(g)) : '-'))];
  }))
);

out.push('### Paired comparisons of tokens (same question and state)', '');
const pairs = [['C2', 'A'], ['B2', 'A'], ['C2', 'B2']];
const scopes = [
  { name: 's0', items: questions.map(q => [q, 's0']) },
  { name: 's1', items: questions.map(q => [q, 's1']) },
  { name: 'both', items: questions.flatMap(q => [[q, 's0'], [q, 's1']]) }
];
table(['Scope', 'X vs Y', 'X cheaper', 'Mean X minus Y', '95% bootstrap interval'], scopes.flatMap(sc => pairs.map(([x, y]) => {
  const diffs = sc.items.map(([q, st]) => run(q.id, st, x).tokens - run(q.id, st, y).tokens);
  const [lo, hi] = bootstrap(diffs);
  return [sc.name, `${x} vs ${y}`, `${diffs.filter(d => d < 0).length} of ${diffs.length}`, signed(mean(diffs)), `${signed(lo)} to ${signed(hi)}`];
})));

out.push('### s1 by question group: tokens over A (mean)', '');
table(['Group', 'A, mean tokens', 'B2', 'C2'], GROUPS.map(g => {
  const qs = questions.filter(g.test);
  return [g.name, fmt(mean(qs.map(q => run(q.id, 's1', 'A').tokens))), ...['B2', 'C2'].map(c => signed(mean(qs.map(q => overA(q, 's1', c)))))];
}));

out.push('### Per question: tokens for A, difference from A for the others, and whether the run read a repository file', '');
table(['Question', 'State', 's1 note', 'A', 'B2', 'C2'], questions.flatMap(q => STATES.map(s => {
  const cell = cond => {
    const r = run(q.id, s.id, cond);
    const g = gradeOf(q.id, s.id, cond);
    const value = cond === 'A' ? fmt(r.tokens) : signed(overA(q, s.id, cond));
    const read = cond === 'A' ? '' : readRepo(r) ? ', read files' : ', notes only';
    return `${value}${read}${g && g !== 'correct' ? ` (${g})` : ''}`;
  };
  return [q.id, s.id, s.id === 's0' ? 'fresh' : q.s1Note, cell('A'), cell('B2'), cell('C2')];
})));

process.stdout.write(out.join('\n'));
