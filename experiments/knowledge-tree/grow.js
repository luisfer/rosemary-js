#!/usr/bin/env node
'use strict';

// Prototype: a build system for AI-derived knowledge.
//
// A note is text an agent derived from inputs: source files (hashed) or other
// notes (hashed by content). The library never calls a model. It computes which
// notes are stale, lists them in dependency order, records rewrites, and renders
// the notes as a tree within a token budget.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
const tokens = (s) => Math.ceil(s.length / 4);

class Tree {
  constructor(dir, file = '.rosemary/tree.json') {
    this.dir = path.resolve(dir);
    this.file = path.join(this.dir, file);
    this.data = fs.existsSync(this.file)
      ? JSON.parse(fs.readFileSync(this.file, 'utf8'))
      : { version: 1, nodes: {}, links: [] };
    this.rootHashes = new Map();
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2) + '\n');
    fs.renameSync(tmp, this.file);
  }

  // Current content of a source, or null when a source file no longer exists.
  // `glob:<pattern>` is the sorted list of matching paths, so claims about
  // presence, absence, or counts ("no test files exist") can be tracked too.
  // An empty match is a valid state, never null.
  sourceContent(rel) {
    if (rel.startsWith('glob:')) {
      return Buffer.from(fs.globSync(rel.slice(5), { cwd: this.dir })
        .filter(f => !f.split(path.sep).includes('node_modules'))
        .sort()
        .join('\n'));
    }
    const abs = path.join(this.dir, rel);
    return fs.existsSync(abs) ? fs.readFileSync(abs) : null;
  }

  sourceHash(rel) {
    if (!this.rootHashes.has(rel)) {
      const content = this.sourceContent(rel);
      this.rootHashes.set(rel, content === null ? null : hash(content));
    }
    return this.rootHashes.get(rel);
  }

  // A copy of each source as it was when a note was written, so `why` can show
  // what changed since. Stored by hash under .rosemary/snapshots/.
  snapshot(rel) {
    const content = this.sourceContent(rel);
    if (content === null) return;
    const file = path.join(path.dirname(this.file), 'snapshots', hash(content));
    if (fs.existsSync(file)) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }

  // What changed in one source since the note recorded hash `h`.
  changes(rel, h, maxLines = 40) {
    const before = path.join(path.dirname(this.file), 'snapshots', h);
    if (!fs.existsSync(before)) return ['(no snapshot of the earlier version)'];
    if (rel.startsWith('glob:')) {
      const was = new Set(fs.readFileSync(before, 'utf8').split('\n').filter(Boolean));
      const now = new Set(this.sourceContent(rel).toString().split('\n').filter(Boolean));
      return [...[...now].filter(f => !was.has(f)).map(f => `+ ${f}`), ...[...was].filter(f => !now.has(f)).map(f => `- ${f}`)];
    }
    const abs = path.join(this.dir, rel);
    if (!fs.existsSync(abs)) return ['(file removed)'];
    const diff = spawnSync('diff', ['-u', '--label', `${rel} (when written)`, '--label', `${rel} (now)`, before, abs], { encoding: 'utf8' });
    const lines = diff.stdout.split('\n').filter(Boolean);
    return lines.length > maxLines ? [...lines.slice(0, maxLines), `(${lines.length - maxLines} more lines)`] : lines;
  }

  // What dependents consume: the gist and the body.
  contentHash(node) {
    return hash(`${node.gist}\n${node.body || ''}`);
  }

  node(id) {
    const node = this.data.nodes[id];
    if (!node) throw new Error(`no note ${id}`);
    return node;
  }

  // Accepts an id, a note title (such as `src/Rosemary.js`), or a path without its prefix.
  resolve(ref) {
    if (this.data.nodes[ref]) return ref;
    const ids = Object.keys(this.data.nodes);
    const byTitle = ids.filter(id => this.data.nodes[id].title === ref);
    if (byTitle.length === 1) return byTitle[0];
    const bare = ref.replace(/\/$/, '');
    const byPath = ids.filter(id => id === `file:${bare}` || id === `dir:${bare}`);
    if (byPath.length === 1) return byPath[0];
    throw new Error(`no note ${ref}`);
  }

  // Record a note and the current hashes of everything it was derived from.
  write(id, spec) {
    const prev = this.data.nodes[id];
    const sources = {};
    for (const rel of spec.sources || []) {
      const h = this.sourceHash(rel);
      if (h === null) throw new Error(`${id}: source not found: ${rel}`);
      sources[rel] = h;
      this.snapshot(rel);
    }
    const uses = {};
    for (const dep of spec.uses || []) uses[dep] = this.contentHash(this.node(dep));
    const node = {
      title: spec.title ?? prev?.title ?? id,
      parent: spec.parent ?? prev?.parent ?? null,
      gist: spec.gist,
      body: spec.body ?? '',
      sources,
      uses,
      instruction: spec.instruction ?? prev?.instruction ?? '',
      by: spec.by ?? 'agent',
      at: spec.at ?? new Date().toISOString()
    };
    const changed = !prev || this.contentHash(prev) !== this.contentHash(node);
    this.data.nodes[id] = node;
    this.save();
    return { id, changed };
  }

  // The inputs changed but the note still holds: keep the text, re-record hashes.
  // Content is unchanged, so notes built on this one stay fresh (early cutoff).
  confirm(id, by = 'agent') {
    const node = this.node(id);
    const waiting = Object.keys(node.uses).filter(dep => this.status(dep).state !== 'fresh');
    if (waiting.length) throw new Error(`${id}: refresh these first: ${waiting.join(', ')}`);
    for (const rel of Object.keys(node.sources)) {
      node.sources[rel] = this.sourceHash(rel);
      this.snapshot(rel);
    }
    for (const dep of Object.keys(node.uses)) node.uses[dep] = this.contentHash(this.node(dep));
    node.by = by;
    node.at = new Date().toISOString();
    this.save();
    return { id, changed: false };
  }

  // fresh: every input matches what the note was built from.
  // stale: a source or input note changed; the note needs a look.
  // waiting: inputs match, but an input note is itself stale or waiting.
  status(id, memo = new Map(), trail = new Set()) {
    if (memo.has(id)) return memo.get(id);
    if (trail.has(id)) throw new Error(`cycle through ${id}`);
    trail.add(id);
    const node = this.node(id);
    const reasons = [];
    for (const [rel, h] of Object.entries(node.sources)) {
      const now = this.sourceHash(rel);
      if (now === null) reasons.push(`source removed: ${rel}`);
      else if (now !== h) reasons.push(`source changed: ${rel}`);
    }
    for (const [dep, h] of Object.entries(node.uses)) {
      const depNode = this.data.nodes[dep];
      if (!depNode) reasons.push(`input removed: ${dep}`);
      else if (this.contentHash(depNode) !== h) reasons.push(`input rewritten: ${dep}`);
    }
    let result;
    if (reasons.length) {
      result = { state: 'stale', reasons };
    } else {
      const blocked = Object.keys(node.uses).filter(dep => this.status(dep, memo, trail).state !== 'fresh');
      result = blocked.length ? { state: 'waiting', reasons: blocked.map(dep => `waits for ${dep}`) } : { state: 'fresh', reasons: [] };
    }
    trail.delete(id);
    memo.set(id, result);
    return result;
  }

  statusAll() {
    const memo = new Map();
    for (const id of Object.keys(this.data.nodes)) this.status(id, memo);
    return memo;
  }

  // Stale notes whose inputs are all fresh can be refreshed now, in this order.
  todo() {
    const memo = this.statusAll();
    const ready = [];
    const later = [];
    for (const [id, st] of memo) {
      if (st.state === 'fresh') continue;
      const inputsFresh = Object.keys(this.data.nodes[id].uses).every(dep => memo.get(dep).state === 'fresh');
      if (st.state === 'stale' && inputsFresh) ready.push({ id, ...st });
      else later.push({ id, ...st });
    }
    return { ready, later, fresh: [...memo.values()].filter(s => s.state === 'fresh').length };
  }

  children(id) {
    return Object.entries(this.data.nodes)
      .filter(([, n]) => n.parent === id)
      .map(([cid]) => cid);
  }

  // Stored answers (notes with a `q:` id) come first, one line each, because they
  // answer questions directly. Then a top-down outline of the other notes fills the
  // rest of the budget. Anything that does not fit is left behind an expand handle.
  read(budget = 800) {
    const memo = this.statusAll();
    const mark = (id) => {
      const st = memo.get(id);
      if (st.state === 'stale') return ` [stale: ${st.reasons[0]}]`;
      if (st.state === 'waiting') return ' [stale below]';
      return ' [fresh]';
    };
    const answers = Object.keys(this.data.nodes).filter(id => id.startsWith('q:'));
    const head = answers.length
      ? ['Stored answers (expand <id> for the full text):', ...answers.map(id => `  ${id} — ${this.data.nodes[id].title}${mark(id)}`), '']
      : [];
    const headText = head.join('\n');
    // Group notes whose branches are all answers have nothing left to show.
    const hidden = new Set(answers);
    for (const id of Object.keys(this.data.nodes)) {
      const kids = this.children(id);
      if (kids.length && kids.every(cid => hidden.has(cid))) hidden.add(id);
    }
    const outline = this.outline(budget - tokens(headText), memo, hidden);
    return head.length ? `${headText}\n${outline}` : outline;
  }

  outline(budget, memo, hidden) {
    const mark = (id) => {
      const st = memo.get(id);
      if (st.state === 'stale') return ` [stale: ${st.reasons[0]}]`;
      if (st.state === 'waiting') return ' [stale below]';
      return '';
    };
    const line = (id, depth) => `${'  '.repeat(depth)}${this.data.nodes[id].title} — ${this.data.nodes[id].gist}${mark(id)}`;
    const visibleChildren = (id) => this.children(id).filter(cid => !hidden.has(cid));
    const roots = Object.keys(this.data.nodes).filter(id => this.data.nodes[id].parent === null && !hidden.has(id));
    const included = new Set();
    const order = [];
    let used = 0;
    let level = roots.map(id => [id, 0]);
    while (level.length) {
      // Share a level fairly: first child of every branch, then the second, and so on.
      const groups = new Map();
      for (const entry of level) {
        const parent = this.data.nodes[entry[0]].parent;
        if (!groups.has(parent)) groups.set(parent, []);
        groups.get(parent).push(entry);
      }
      const lists = [...groups.values()];
      const next = [];
      for (let i = 0; lists.some(list => i < list.length); i++) {
        for (const list of lists) {
          if (i >= list.length) continue;
          const [id, depth] = list[i];
          const cost = tokens(line(id, depth)) + 1;
          if (used + cost > budget) continue;
          included.add(id);
          order.push(id);
          used += cost;
          for (const cid of visibleChildren(id)) next.push([cid, depth + 1]);
        }
      }
      level = next;
    }
    const render = () => {
      const out = [];
      const walk = (id, depth) => {
        out.push(line(id, depth));
        const kids = visibleChildren(id);
        const shown = kids.filter(cid => included.has(cid));
        for (const cid of shown) walk(cid, depth + 1);
        if (shown.length < kids.length) {
          out.push(`${'  '.repeat(depth + 1)}+${kids.length - shown.length} more: expand ${id}`);
        }
      };
      for (const id of roots) if (included.has(id)) walk(id, 0);
      return out.join('\n');
    };
    // Expand handles cost tokens too; drop the last-added notes until the whole outline fits.
    let text = render();
    while (tokens(text) > budget && order.length > 1) {
      included.delete(order.pop());
      text = render();
    }
    return text;
  }

  expand(id) {
    const node = this.node(id);
    const st = this.status(id);
    const out = [`${node.title} — ${node.gist}`, `status: ${st.state}${st.reasons.length ? ` (${st.reasons.join('; ')})` : ''}`, '', node.body];
    const kids = this.children(id);
    if (kids.length) {
      out.push('', 'branches:');
      for (const cid of kids) out.push(`  ${cid} [${this.status(cid).state}] ${this.data.nodes[cid].title} — ${this.data.nodes[cid].gist}`);
    }
    const links = this.data.links.filter(l => l.from === id || l.to === id);
    if (links.length) {
      out.push('', 'links:');
      for (const l of links) {
        const other = l.from === id ? l.to : l.from;
        const arrow = l.from === id ? `-${l.type}->` : `<-${l.type}-`;
        out.push(`  ${arrow} ${this.data.nodes[other].title}${l.note ? ` (${l.note})` : ''}`);
      }
    }
    const sources = Object.keys(node.sources);
    out.push('', `derived from: ${[...sources, ...Object.keys(node.uses)].join(', ') || 'nothing'}`);
    out.push(`written by ${node.by} at ${node.at}`);
    return out.join('\n');
  }

  // Provenance: the chain of notes down to the source files, with their state.
  why(id, depth = 0, out = []) {
    const node = this.node(id);
    const st = this.status(id);
    out.push(`${'  '.repeat(depth)}${id} [${st.state}] by ${node.by} at ${node.at.slice(0, 10)}`);
    for (const [rel, h] of Object.entries(node.sources)) {
      const now = this.sourceHash(rel);
      out.push(`${'  '.repeat(depth + 1)}${rel} ${now === h ? 'unchanged' : now === null ? 'REMOVED' : 'CHANGED'} since the note was written`);
      if (now !== h && now !== null) {
        for (const l of this.changes(rel, h)) out.push(`${'  '.repeat(depth + 2)}${l}`);
      }
    }
    for (const dep of Object.keys(node.uses)) this.why(dep, depth + 1, out);
    return out.join('\n');
  }

  link(from, to, type, note = '') {
    this.node(from);
    this.node(to);
    this.data.links.push({ from, to, type, note });
    this.save();
  }

  sizes() {
    const files = new Set();
    for (const n of Object.values(this.data.nodes)) {
      Object.keys(n.sources).filter(f => !f.startsWith('glob:')).forEach(f => files.add(f));
    }
    let sourceChars = 0;
    for (const f of files) sourceChars += fs.readFileSync(path.join(this.dir, f), 'utf8').length;
    const nodes = Object.values(this.data.nodes);
    return {
      notes: nodes.length,
      sourceFiles: files.size,
      sourceTokens: tokens(' '.repeat(sourceChars)),
      gistTokens: nodes.reduce((t, n) => t + tokens(`${n.title} — ${n.gist}`), 0),
      bodyTokens: nodes.reduce((t, n) => t + tokens(n.body), 0)
    };
  }
}

module.exports = { Tree, tokens };

if (require.main === module) {
  const [cmd, arg] = process.argv.slice(2);
  const opt = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : fallback;
  };
  const tree = new Tree(opt('dir', process.cwd()));
  const print = (s) => process.stdout.write(`${s}\n`);
  if (cmd === 'read') {
    const text = tree.read(Number(opt('budget', 800)));
    print(`${text}\n(~${tokens(text)} tokens)`);
  }
  else if (cmd === 'expand') print(tree.expand(tree.resolve(arg)));
  else if (cmd === 'why') print(tree.why(tree.resolve(arg)));
  else if (cmd === 'confirm') print(JSON.stringify(tree.confirm(arg, opt('by', 'agent'))));
  else if (cmd === 'write') print(JSON.stringify(tree.write(arg, JSON.parse(fs.readFileSync(opt('spec'), 'utf8')))));
  else if (cmd === 'sizes') print(JSON.stringify(tree.sizes(), null, 2));
  else if (cmd === 'todo' || cmd === 'status') {
    const { ready, later, fresh } = tree.todo();
    print(`${fresh} fresh, ${ready.length} to refresh now, ${later.length} to check after that`);
    ready.forEach((t, i) => print(`${i + 1}. ${t.id}: ${t.reasons.join('; ')}\n   instruction: ${tree.node(t.id).instruction}`));
    if (later.length) print(`then: ${later.map(t => `${t.id} (${t.reasons.join('; ')})`).join(', ')}`);
  } else {
    print('usage: grow.js <read|expand|why|todo|confirm|write|sizes> [id] [--dir d] [--budget n] [--spec file]');
    process.exitCode = 1;
  }
}
