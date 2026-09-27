#!/usr/bin/env node
'use strict';

// Summarizes experiment 4 as Markdown tables.
// Usage: node experiments/knowledge-tree/eval/analyze4.js
//
// Reads runs4.jsonl (one line per session and timeline), questions4.json,
// grades4.json (when present), and memory4.jsonl (the memory state recorded
// before each session) from this directory.

const fs = require('fs');
const path = require('path');

const here = __dirname;
const lines = file => fs.readFileSync(path.join(here, file), 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
const runs = lines('runs4.jsonl');
const plan = JSON.parse(fs.readFileSync(path.join(here, 'questions4.json'), 'utf8'));
const grades = fs.existsSync(path.join(here, 'grades4.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'grades4.json'), 'utf8')).grades : [];
const memory = fs.existsSync(path.join(here, 'memory4.jsonl')) ? lines('memory4.jsonl') : [];

const CONDS = ['A', 'B', 'C'];
const TIMELINES = { A: ['A1', 'A2', 'A3'], B: ['B1', 'B2', 'B3'], C: ['C1', 'C2', 'C3'] };
const SESSIONS = plan.schedule.map(s => s.session);
const run = (session, timeline) => {
  const r = runs.find(x => x.session === session && x.timeline === timeline);
  if (!r) throw new Error(`missing run s${session} ${timeline}`);
  return r;
};
const gradeOf = (session, timeline) => (grades.find(g => g.session === session && g.timeline === timeline) || {}).grade;
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmt = n => Math.round(n).toLocaleString('en-US');
const signed = n => `${n >= 0 ? '+' : ''}${fmt(n)}`;

const out = [];
const table = (head, rows) => {
  out.push(`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`);
  for (const row of rows) out.push(`| ${row.join(' | ')} |`);
  out.push('');
};

// Totals over the twelve sessions.
const total = t => SESSIONS.reduce((sum, s) => sum + run(s, t).tokens, 0);
out.push('### Tokens over the twelve sessions', '');
table(['Condition', 'Timeline 1', 'Timeline 2', 'Timeline 3', 'Mean', 'Mean per session', 'Over A'], CONDS.map(c => {
  const totals = TIMELINES[c].map(total);
  const aMean = mean(TIMELINES.A.map(total));
  return [c, ...totals.map(fmt), fmt(mean(totals)), fmt(mean(totals) / SESSIONS.length), c === 'A' ? '-' : signed(mean(totals) - aMean)];
}));

// By kind of session.
const kinds = [...new Set(plan.schedule.map(s => s.kind))];
out.push('### Tokens per session by kind (mean over sessions and timelines)', '');
table(['Kind', 'Sessions', 'A', 'B', 'C'], kinds.map(k => {
  const ss = plan.schedule.filter(s => s.kind === k).map(s => s.session);
  return [k, ss.join(', '), ...CONDS.map(c => fmt(mean(ss.flatMap(s => TIMELINES[c].map(t => run(s, t).tokens)))))];
}));

// Per session.
out.push('### Per session: mean tokens, and answers not graded correct', '');
table(['Session', 'State', 'Question', 'Kind', 'A', 'B', 'C'], plan.schedule.map(s => [
  String(s.session), s.state, s.qid, s.kind,
  ...CONDS.map(c => {
    const toks = fmt(mean(TIMELINES[c].map(t => run(s.session, t).tokens)));
    const bad = TIMELINES[c].map(t => gradeOf(s.session, t)).filter(g => g && g !== 'correct');
    return bad.length ? `${toks} (${bad.join(', ')})` : toks;
  })
]));

// Grades per condition.
if (grades.length) {
  out.push('### Grades (36 answers per condition)', '');
  table(['Condition', 'Correct', 'Partial', 'Stale', 'Incorrect'], CONDS.map(c => [c,
    ...['correct', 'partial', 'stale', 'incorrect'].map(g => String(grades.filter(x => TIMELINES[c].includes(x.timeline) && x.grade === g).length))]));
}

// Was the stored answer flagged stale when the answer had changed? From the memory recorded before each session.
if (memory.length) {
  const MATCH = {
    unsaved: /sav/i,
    untested: /test/i,
    data_file: /data[- ]?file|ROSEMARY_DATA_FILE/i,
    cli_docs: /readme|cli command/i
  };
  out.push('### Stored answers covering the question, before each repeat session (C)', '');
  const rows = [];
  for (const s of plan.schedule.filter(x => x.kind.startsWith('repeat'))) {
    for (const t of TIMELINES.C) {
      const rec = memory.find(m => m.tag === `before-s${s.session}` && m.timeline === t);
      const notes = rec ? rec.notes.filter(n => MATCH[s.qid].test(`${n.id} ${n.title} ${n.gist}`)) : [];
      rows.push([String(s.session), s.qid, s.kind, t, notes.map(n => `${n.id} [${n.state}] <- ${n.sources.join(', ')}`).join('; ') || 'none']);
    }
  }
  table(['Session', 'Question', 'Kind', 'Timeline', 'Stored answers (state, sources)'], rows);
}

process.stdout.write(out.join('\n'));
