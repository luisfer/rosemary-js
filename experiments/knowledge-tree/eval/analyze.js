#!/usr/bin/env node
'use strict';

// Summarizes the knowledge-tree experiment runs as Markdown tables.
// Usage: node experiments/knowledge-tree/eval/analyze.js
//
// Reads runs.jsonl (one line per agent run), questions.json, and grades.json
// (final grade per question and condition) from this directory.

const fs = require('fs');
const path = require('path');

const here = __dirname;
const runs = fs.readFileSync(path.join(here, 'runs.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
const { questions } = JSON.parse(fs.readFileSync(path.join(here, 'questions.json'), 'utf8'));
const gradesFile = path.join(here, 'grades.json');
const grades = fs.existsSync(gradesFile) ? JSON.parse(fs.readFileSync(gradesFile, 'utf8')).grades : [];

const control = runs.find(r => r.qid === '_control').tokens;
const CONDS = ['A', 'B', 'C', 'B2', 'C2'];
const GROUPS = [
  { name: 'Answer changed (8)', test: q => q.drift },
  { name: 'Note stale, answer unchanged (7)', test: q => !q.drift && q.cNote === 'stale' },
  { name: 'Note fresh (7)', test: q => q.cNote === 'fresh' }
];

const byKey = new Map(runs.filter(r => r.qid !== '_control').map(r => [`${r.qid}|${r.cond}`, r]));
const run = (qid, cond) => {
  const r = byKey.get(`${qid}|${cond}`);
  if (!r) throw new Error(`missing run ${qid} ${cond}`);
  return r;
};
const calls = r => r.tool_uses - 1; // the last tool use hands the answer back
const readRepo = r => r.sources.split(',').map(s => s.trim()).filter(s => /repo-[ABC]\//.test(s)).length;
const gradeOf = (qid, cond) => (grades.find(g => g.qid === qid && g.cond === cond) || {}).grade;

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmt = n => Math.round(n).toLocaleString('en-US');
const fmt1 = n => n.toFixed(1);

// Seeded bootstrap of the mean of paired differences, for a 95% interval.
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

out.push(`Tokens are the agent's context size at the end of a run, as reported by the harness. A control run with no question and no tools used ${fmt(control)}; the fixed part varies by about 1,000 tokens between runs, so compare conditions on the same question.`, '');

out.push('### By condition (22 questions each)', '');
table(
  ['Condition', 'Tokens, mean', 'Over A, mean', 'Tool calls, mean', 'Seconds, mean', 'Runs that read no repository file', 'Correct', 'Partial', 'Stale', 'Incorrect'],
  CONDS.map(cond => {
    const rs = questions.map(q => run(q.id, cond));
    const count = g => questions.filter(q => gradeOf(q.id, cond) === g).length;
    const overA = questions.map(q => run(q.id, cond).tokens - run(q.id, 'A').tokens);
    return [cond, fmt(mean(rs.map(r => r.tokens))), cond === 'A' ? '-' : fmt(mean(overA)), fmt1(mean(rs.map(calls))),
      fmt1(mean(rs.map(r => r.ms / 1000))), String(rs.filter(r => readRepo(r) === 0).length),
      ...['correct', 'partial', 'stale', 'incorrect'].map(g => (grades.length ? String(count(g)) : '-'))];
  })
);

out.push('### Tokens over A by question group (mean of paired differences)', '');
table(['Group', 'A, mean tokens', ...CONDS.slice(1)], GROUPS.map(g => {
  const qs = questions.filter(g.test);
  return [g.name, fmt(mean(qs.map(q => run(q.id, 'A').tokens))),
    ...CONDS.slice(1).map(cond => fmt(mean(qs.map(q => run(q.id, cond).tokens - run(q.id, 'A').tokens))))];
}));

out.push('### Tool calls by question group (mean)', '');
table(['Group', ...CONDS], GROUPS.map(g => {
  const qs = questions.filter(g.test);
  return [g.name, ...CONDS.map(cond => fmt1(mean(qs.map(q => calls(run(q.id, cond))))))];
}));

out.push('### Paired comparisons of tokens (same question, 22 pairs)', '');
const PAIRS = [['B', 'A'], ['C', 'A'], ['C', 'B'], ['B2', 'A'], ['C2', 'A'], ['C2', 'B2'], ['B2', 'B'], ['C2', 'C']];
table(['X vs Y', 'X cheaper', 'Mean X minus Y', '95% bootstrap interval'], PAIRS.map(([x, y]) => {
  const diffs = questions.map(q => run(q.id, x).tokens - run(q.id, y).tokens);
  const [lo, hi] = bootstrap(diffs);
  return [`${x} vs ${y}`, `${diffs.filter(d => d < 0).length} of 22`, fmt(mean(diffs)), `${fmt(lo)} to ${fmt(hi)}`];
}));

out.push('### Per question: tokens for A, and difference from A for the others (grade if not correct)', '');
table(['Question', 'Group', ...CONDS], questions.map(q => {
  const group = GROUPS.find(g => g.test(q)).name.replace(/ \(\d+\)$/, '');
  const a = run(q.id, 'A').tokens;
  return [q.id, group, ...CONDS.map(cond => {
    const g = gradeOf(q.id, cond);
    const value = cond === 'A' ? fmt(a) : `${run(q.id, cond).tokens - a >= 0 ? '+' : ''}${fmt(run(q.id, cond).tokens - a)}`;
    return `${value}${g && g !== 'correct' ? ` (${g})` : ''}`;
  })];
}));

process.stdout.write(out.join('\n'));
