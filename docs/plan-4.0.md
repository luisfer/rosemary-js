# Plan: 3.1.0 through 4.2.0

Status: proposal for review. Written 2026-09-26 against `3.0.2` (commit `a22f134`). Nothing in this document is implemented yet.

This document records the verified state of `3.0.2`, the directions considered for the next major line, the one recommended, and a release sequence that reaches it without breaking the v1.x `Rosemary` API.

## Summary

- **Release `3.1.0` first.** It closes a data-loss path (an unreadable data file is replaced on the next save), makes writes atomic, fixes a retired default model in `ClaudeProvider`, cuts the tarball from 4.3 MB to about 44 KB, and reorders the release tooling so nothing irreversible happens before every check has passed. No breaking changes.
- **Recommended direction: a memory graph for agents.** Each leaf becomes a claim that can carry a source, a validity window, and a status. A changed fact supersedes the old claim instead of overwriting it. Recall returns the current claims for a query, flags contradictions, and renders them as an outline that fits a token budget; branches that do not fit come back as expand handles. The "connecting dots" idea stays: typed links drive retrieval, and the outline is the mindmap.
- **`4.0.0` carries every breaking change at once**: Node 22+, production dependencies from 9 to 1, a silent library, multi-type edges, traversal in both directions, and schema version 3. Every v1.x `Rosemary` method keeps its signature.
- **`4.1.0` adds the memory API** (`rosemary-js/memory`) and the matching CLI commands. **`4.2.0` adds import and export formats.** `rosemary-mcp` ships as a separate package after `4.1.0`.
- **Releases move to a release pull request plus CI publishing** with npm trusted publishing and provenance. Prereleases go to the `next` dist-tag.

## 1. State of 3.0.2

Verified on 2026-09-26 with Node 22.22.2 and npm 10.9.7. Reproduction steps are in the appendix.

### What works

- 57 Jest tests pass. `npm run eval:agent-context` passes 4 of 4 tasks.
- The reserved edge vocabulary, `infer`, `resolve`, `walk`, `bridge`, token-budgeted `buildPromptContext`, and the TypeScript declarations behave as documented.
- npm and git agree for every release since the 2.0.0 restart: for `2.0.0`, `3.0.0`, `3.0.1`, and `3.0.2`, the `gitHead` recorded on npm is the commit the matching tag points at. `3.0.2` is `a22f134`, the tip of `main`.
- `AGENTS.md`, the voice contract, `docs/non-goals.md`, and the release guard scripts give the project explicit rules.

### Defects and gaps

| ID | Finding | Evidence | Fixed in |
|---|---|---|---|
| S1 | An unreadable data file is replaced on the next save. `loadData` catches the JSON parse error, logs it, and resets to an empty store. The next autosave writes the empty store over the file. | A truncated file holding 2 leaves holds 1 leaf after one `addLeaf`. | 3.1.0 |
| S2 | Saves write the target path in place (`fs.writeFileSync`). A crash during a write leaves a truncated file, which then triggers S1. | `src/Rosemary.js` `saveData` | 3.1.0 |
| S3 | `saveData()` returns without writing when `autoSave` is `false`. A store opened with `autoSave: false` can only be persisted through `exportToJSON`. | Probe 1 | 3.1.0 |
| S4 | Every mutation rewrites the whole file, and there is no way to group writes. | 2,000 autosaved `addLeaf` calls take 2.6 s (517 KB file). | 3.1.0 |
| S5 | Two processes on one file overwrite each other without detection. This becomes likely once an MCP server and the CLI share a store. | By construction | 3.1.0 (opt-in), 4.0.0 (default) |
| G1 | One relationship per ordered pair. Adding `co-occurs-with` to a pair joined by `implies` removes `implies`. | Probe 4 | 4.0.0 |
| G2 | A directed edge is invisible from its target. With `Algebra -prerequisite-of-> Calculus`, `getRelatedLeaves(Calculus)` is empty and `bridge(Calculus, Algebra)` is `null`. | Probe 10 | 4.0.0 |
| G3 | `getTotalConnections()` halves every edge: 3 directed edges report `1.5`. | Probe 5 | 3.1.0 |
| G4 | `connectSimilarLeaves` stores free-text relationship names such as `Common tags: t1, t2`. | Probe 10 | 4.0.0 |
| A1 | Library code prints to stdout: 6 lines for one `loadData` and two `addLeaf` calls. The MCP specification says a stdio server "MUST NOT write anything to its `stdout` that is not a valid MCP message", so `examples/mcp/` cannot become a server until the core is silent. | Probe 3 | 3.1.0 (option), 4.0.0 (default) |
| A2 | A new store is seeded with "Welcome to Rosemary.js! This is your first leaf." An agent's first recall returns it. | Probe 3 | 4.0.0 |
| A3 | Embeddings live only in memory, so a hosted embedder re-embeds every leaf on each process start. `cosineSimilarity` compares vectors of different lengths by truncating to the shorter one instead of failing. | Probe 8; `src/llm/RosemaryLLM.js` | 4.0.0, 4.1.0 |
| A4 | `Rosemary#resolve` is synchronous and `RosemaryLLM#resolve` returns a Promise. `llm.d.ts` types it as `Promise<unknown>`. | Probe 7 | 4.0.0 |
| A5 | Context packs are JSON. For one 9-leaf pack: detailed JSON is about 733 tokens, concise JSON about 377, and an outline with the same facts, ids, and relationship labels about 186 (characters / 4). `related` is sorted by relevance, so a child is not placed under its parent. | Probe 11 | 4.1.0 |
| A6 | `ClaudeProvider` defaults to `claude-3-5-sonnet-20240620`, which was retired on 2025-10-28. A live call without an explicit `model` fails. `docs/llm.md` uses the same id; the README reads `CLAUDE_API_KEY` instead of the conventional `ANTHROPIC_API_KEY`. | Anthropic model deprecation table | 3.1.0 |
| A7 | CSV export drops metadata and every connection. CSV import ignores timestamps. | Probe 9 | 4.2.0 |
| P1 | A default `npm install rosemary-js` installs 235 packages (76 MB), including `express`, `swagger-ui-express`, `swagger-jsdoc`, and `http-server`: npm installs `optionalDependencies` unless told not to. The 2.0.0 CHANGELOG entry and `docs/non-goals.md` state that the base install does not pull Express. | Install into an empty directory | 3.1.0 (docs), 4.0.0 (fix) |
| P2 | With `--omit=optional` the install is still 121 packages (43 MB). `inquirer` pulls `rxjs` and `lodash`; `getLeafContentAsHTML` pulls `jsdom`. | Same | 4.0.0 |
| P3 | The tarball is 4.3 MB; 4.27 MB of it is three logo PNGs. `scripts/`, `examples/`, and `evals/` also ship, although the `exports` map makes them unreachable. Without those four directories: 43.8 KB packed, 31 files. | `npm pack --dry-run` | 3.1.0 |
| P4 | `engines.node` is `>=20` and CI tests Node 20 and 22. Node 20 reached end of life on 2026-04-30. | Node release schedule | 4.0.0 |
| R1 | `release.js` runs `npm version` and `git push --follow-tags` before `npm publish`. The CHANGELOG and registry checks run only inside `prepublishOnly`, after the tag is public. The CHANGELOG check is a substring match, so `4.0.0` passes on a file that only mentions `4.0.0-rc.1`. Prereleases get no dist-tag handling: npm 10, which ships with Node 22, would publish a release candidate as `latest`, and npm 11 or later refuses to publish it without `--tag`. | `scripts/release.js`, `scripts/check-release.js` | 3.1.0 |
| R2 | `main` contains `chore(release): 2.1.0` (`a0e6c6c`) with no `v2.1.0` tag and no `2.1.0` on npm. 32 minutes later the `3.0.0` release commit renamed the CHANGELOG heading from `2.1.0` to `3.0.0`. The version was changed after the release run had started. | `git log`, `git ls-remote --tags`, `npm view` | 3.1.0 (process) |
| R3 | `3.0.0` was a major bump without a breaking change. | CHANGELOG `3.0.0` | Policy |
| R4 | `SECURITY.md` lists 2.x as the supported line. `CONTRIBUTING.md` asks for an `## Unreleased` CHANGELOG section that does not exist. The eval and a tarball check do not run in CI. | Files as listed | 3.1.0 |
| R5 | `npm test` writes fixtures into the repository root (`tmp_cli/`, `tmp_roundtrip/`). `.gitignore` covers only `tmp_cli/`, so every test run leaves an untracked `tmp_roundtrip/data.json`. | `src/_tests_/Rosemary.test.js:220` | 3.1.0 |
| V1 | CLI output uses emoji and promotional text (`rosemary hello` prints "You are amazing, and you matter!"). The voice contract in `AGENTS.md` excludes both. | `src/cli.js` | 4.0.0 |

S1, A1, A6, P1, and R1 matter most. S1 loses data. A1 blocks the MCP direction. A6 is a shipped default that no longer works. P1 is a documentation claim that is false. R1 can reproduce the git/npm desync the release scripts were written to prevent.

## 2. Directions considered

Criteria:

- **Agent value**: addresses a failure that agents hit in practice.
- **Distinct**: not already covered by a maintained tool in the same niche (local, JavaScript, no infrastructure).
- **Fit**: builds on leaves, typed edges, and one JSON file; compatible with `docs/non-goals.md` or needs only a small amendment.
- **Cost**: weeks of work for one maintainer, not months. Lower is better.
- **Measurable**: a deterministic eval can show that it works without an LLM in CI.

### 1. Memory graph with sources and time

Claims carry a source, a validity window, and a status (`active`, `superseded`, `retracted`). A changed fact is recorded as a new claim with a `supersedes` edge to the old one. `contradicts` pairs are reported as open conflicts. `derived-from` edges connect a claim to the claim or source it came from, so one retraction can find every claim built on a bad source. Recall filters to current claims.

- Serves: coding agents and assistants that carry facts across sessions, and the people who review what an agent stored.
- Prior art: see the table below the list of directions.
- Fit: high. `contradicts` and directed edges already exist. The store stays one JSON file.
- Risk: drift toward a database. Mitigation: no transactions, no concurrent writers, no query language.

### 2. Context compiler (progressive disclosure)

The "branching" idea applied to retrieval. Recall returns an outline inside a token budget: entry claims at the top, linked claims as indented branches labelled with the relationship, and branches that do not fit as expand handles. Hub claims can carry a short summary that stands in for their branch.

- Serves: any agent that pays for context by the token.
- Fit: high. `buildPromptContext` already walks and prunes.
- Limit: it presents whatever the store holds, stale claims included. On its own it is a formatting layer that other stores can copy.
- Measured: on the sample in probe 11 the outline uses about half the tokens of the concise JSON pack.
- Support: Anthropic's context-engineering guidance recommends keeping lightweight identifiers and loading details just in time, which is what expand handles do. Chroma's context-rot study reports that focused prompts beat full-length ones on LongMemEval for every model tested, so a smaller pack is about accuracy as well as cost.

### 3. MCP-first project memory

Ship `rosemary-mcp` now, on the 3.x core, as project memory for MCP clients.

- Limit: without new semantics it duplicates the reference MCP memory server (see Prior art). It is also blocked by A1 until the core stops printing.
- Kept as: the delivery channel for direction 1.

### 4. Associative discovery

Suggest links between claims that are close in meaning but far apart in the graph, find bridges between clusters, and propose analogies for research and brainstorming. This is the literal reading of "connecting seemingly unrelated concepts".

- Limit: hard to measure. The natural implementation is a set of graph algorithms, which `docs/non-goals.md` excludes.
- Kept as: a later `audit()` check that lists candidate missing links for review.

### 5. Markdown vault index

Treat a folder of Markdown notes (front matter, `[[links]]`) as the store, answer graph queries over it, and write changes back.

- Limit: two-way sync is most of the work, and sync is a non-goal.
- Kept as: a later read-only Markdown export (one file per claim, with links).

### 6. Agent work graph

Tasks with `blocks` and `depends-on` edges and a queue of unblocked work for coding agents.

- Limit: a different product, with an established tool already in use (see Prior art).
- Not kept.

### 7. Interchange and ingestion toolkit

JSON Schema for the data file, lossless CSV for nodes and edges, graphology export, and importers from other memory formats.

- Limit: useful, but not a reason to adopt the library on its own.
- Kept as: `4.2.0`.

### 8. LLM extraction pipeline

`ingest(text)` extracts claims and typed edges with an LLM.

- Limit: a crowded space. Quality depends on prompts and models the library does not control. It conflicts with the "not an LLM provider" non-goal.
- Not kept in core. Callers and agents extract, then call `remember`.

### Prior art

Checked on 2026-09-26. Sources are listed in the appendix.

| Tool | What it is | Relevant to |
|---|---|---|
| Reference MCP memory server (`@modelcontextprotocol/server-memory`) | Entities with string observations, plus directed relations, in a JSONL file. No ids, timestamps, or sources. Every change rewrites the whole file. In the published build, one malformed line fails the whole load, and the default file sits inside the package directory (the npx cache when started through npx). | 1, 3, 7 |
| Graphiti (Zep) | Python temporal knowledge graph on Neo4j, FalkorDB, or Neptune. Facts carry validity windows and are invalidated rather than deleted; every fact traces back to its raw input. Ships an MCP server. | 1 |
| mem0 | Python and TypeScript memory layer. The open-source v3 combines a vector store, BM25, and entity matching; graph memory is now in the hosted platform only. Retrieval is sized by `top_k`, not by a token budget. | 1, 8 |
| Letta Code (formerly Letta, MemGPT) | TypeScript agent with editable memory blocks; its memory files are tracked in git. The Python server is retired. | 1 |
| Basic Memory | Python, AGPL-3.0. Markdown files are the source of truth, indexed in SQLite and served over MCP. No temporal model. | 5 |
| Cognee | Python pipelines that build a graph and vector index from documents, with `remember` and `recall` and event timelines. | 8 |
| A-MEM (NeurIPS 2025) | Research code: Zettelkasten-style notes with keywords, context, and links; a new note can revise related notes. | 1, 4 |
| HippoRAG and HippoRAG 2 | Research frameworks: extract triples into a graph, then retrieve with personalized PageRank from the query's entities. | 2, 4 |
| Microsoft GraphRAG | LLM-extracted entity graph, communities, and community summaries, with a token limit on context. In maintenance mode. | 2, 8 |
| Anthropic memory tool | The model reads and writes files under `/memories`, stored by the application. No graph, validity, or sources. | 1, 2 |
| beads | Issue graph for coding agents with dependency edges and a queue of unblocked work. Its source of truth moved from a JSONL file to Dolt, a versioned SQL database; the JSONL file is now an export. | 6 |
| LongMemory (formerly OpenMemory) | TypeScript, Apache-2.0, on SQLite or Postgres. The published code stores temporal facts with `valid_from`, `valid_to`, and `confidence`; MCP over stdio and HTTP. Large dependency tree (AWS SDK, googleapis, pg, sqlite3, ioredis). | 1 |
| mcp-memory-graph | Node, one SQLite file with native modules and a local embedding model. Validity and transaction time with `as_of` queries, signed provenance, a token-budgeted query tool, personalized PageRank. PolyForm Noncommercial license. | 1, 2 |
| GraphZep, memento-mcp | TypeScript temporal graphs that need Neo4j or a similar server. | 1 |

Time-aware memory with provenance already exists in TypeScript (LongMemory, mcp-memory-graph), so direction 1 is not new on its own. None of the tools above offers all of the following together: a permissive license, no services and no native modules, a plain file that git can diff and merge, and typed edges with defined meaning. That combination is the opening, and it puts the weight on the storage format rather than on the temporal model. Several projects are moving toward versioned, file-backed memory (Letta Code in git, Basic Memory on Markdown, beads on Dolt). beads moved its source of truth off a plain file, which is a reminder that a file has limits on scale and concurrent writes; rosemary should state its limits instead of stretching past them.

### Comparison

| Direction | Agent value | Distinct | Fit | Cost | Measurable |
|---|---|---|---|---|---|
| 1. Memory graph with sources and time | High | Medium | High | Medium | High |
| 2. Context compiler | High | Medium | High | Low | High |
| 3. MCP-first project memory | Medium | Low | High | Low | Medium |
| 4. Associative discovery | Low | Medium | Medium | Medium | Low |
| 5. Markdown vault index | Medium | Low | Low | High | Low |
| 6. Agent work graph | Medium | Low | Low | Medium | High |
| 7. Interchange toolkit | Low | Low | High | Low | High |
| 8. LLM extraction pipeline | High | Low | Low | High | Medium |

### Decision

Direction 1, with direction 2 as its read path, directions 3 and 7 as delivery, and parts of 4 and 5 as later checks and exports.

Direction 2 is closest to the original mindmap idea and is kept in full. It is not the lead because it cannot tell a current claim from a superseded one: a shorter pack of stale facts is still stale. Direction 1 supplies that distinction, and it changes the data model, which is hard to retrofit later. The outline format is cheap to add on top of it.

The temporal model is not what sets direction 1 apart; other TypeScript stores have one (see Prior art). The storage is: a plain file with no services and no native modules, under a permissive license.

## 3. Recommended direction: a memory graph with sources and time

Rosemary stores agent memory as one JSON file of claims. Each claim is a leaf that can carry a source, a validity window, and a status. A change to a fact adds a new claim that supersedes the old one; the old claim stays, marked superseded. Recall resolves a query to entry claims, follows typed links in both directions, drops superseded and retracted claims, flags contradictions, and returns an outline that fits a token budget. Branches that do not fit come back as handles for `expand`.

### Why this direction

1. **It targets a failure that append-only memory cannot avoid: acting on a fact that is no longer true.** Append-only stores (plain memory files, the reference MCP memory server, `addLeaf`) return the old fact next to the new one, and the agent cannot tell them apart. Supersession and validity make "current" something the store knows.
2. **It gives the graph work a list cannot do.** `supersedes` chains record how a fact changed. `contradicts` pairs are open questions to show the agent. `derived-from` links let one retraction find every claim built on a bad source.
3. **It keeps the file model.** One JSON file, readable in a diff and committed next to the code it describes. The same property makes `AGENTS.md` and `CLAUDE.md` files easy to review; the store adds structure without adding a server.
4. **It keeps branching where branching pays.** The outline is a mindmap of the relevant part of the graph, and expand handles let the agent pull a branch only when it needs it.
5. **It is measurable** with deterministic evals (section 6).

### Data model (schema version 3)

Leaf fields added. All are optional and omitted from JSON when unset, so version 2 files load unchanged.

| Field | Type | Meaning |
|---|---|---|
| `source` | string | Where the claim came from: a file path, URL, session id, or person. |
| `validFrom` | ISO 8601 string | Start of the period in which the claim holds. Defaults to the creation time. |
| `validTo` | ISO 8601 string | End of that period. Unset while the claim is current. |
| `status` | `active` \| `superseded` \| `retracted` | Defaults to `active`. |
| `confidence` | number, 0 to 1 | Optional weight supplied by the caller. |
| `summary` | string | Short form used in outlines when the full content does not fit. |

`createdAt` and `lastModified` stay epoch milliseconds for compatibility.

Edges become records: `{ from, to, type, directed, createdAt, source? }`. A pair can hold several types. Two reserved types are added to `rosemary-js/edges`:

| Type | Direction | Meaning |
|---|---|---|
| `supersedes` | new → old | The new claim replaces the old one. Transitive. |
| `derived-from` | claim → origin | The claim was derived from the origin claim. Transitive. |

### API sketch (`rosemary-js/memory`, 4.1.0)

A new entry point wraps a `Rosemary` instance. The v1.x class keeps its API, and "current view" rules do not leak into v1 methods such as `getAllLeaves`.

```javascript
const Memory = require('rosemary-js/memory');

const memory = new Memory({ dataFile: './.rosemary/memory.json' });

const first = await memory.remember('Access tokens expire after 1 hour', {
  tags: ['auth'],
  source: 'docs/auth.md'
});

// The fact changes. The old claim is kept and marked superseded.
await memory.supersede(first.id, 'Access tokens expire after 15 minutes', {
  source: 'docs/auth.md, 2026-09-12 revision'
});

const pack = await memory.recall('why do requests start failing with 401?', { budget: 400 });
pack.text;     // outline within 400 tokens
pack.items;    // [{ id, score, path, status }] for tools and tests
pack.handles;  // ids accepted by memory.expand()
```

| Method | Returns | Notes |
|---|---|---|
| `remember(content, { tags, source, validFrom, summary, links })` | `{ id, duplicateOf?, similar }` | An exact or alias match returns the existing id as `duplicateOf` instead of adding a copy. Close matches are listed in `similar`; the caller decides whether to `supersede`, because "expires after 1 hour" and "expires after 2 hours" are close in wording and are an update, not a duplicate. `links` (`[{ to, type }]`) connects the new claim when it is created. |
| `supersede(id, content, options)` | `{ id }` | New claim plus a `supersedes` edge. The old claim gets `status: 'superseded'` and `validTo`. |
| `retract(id, { reason, source })` | `void` | Status `retracted`. The claim is kept for audit. |
| `forget(id)` | `boolean` | Hard delete, for secrets and personal data. |
| `recall(query, { budget, asOf, includeHistory, depth })` | `{ text, items, handles, tokens }` | See below. |
| `expand(id, { budget })` | Same shape as `recall` | The next layer below a handle. |
| `history(id)` | `Leaf[]` | The supersession chain, newest first. |
| `conflicts()` | `[{ a, b }]` | Active claims joined by `contradicts`. |
| `impact(idOrSource)` | `Leaf[]` | Claims that derive from a claim or source, for review before a retraction. |
| `audit()` | report object | Exact duplicates, conflicts, claims without a source, expired validity, dangling edges. |
| `graph` | `Rosemary` | The underlying store. |

`remember`, `supersede`, `recall`, and `expand` are async because they may call an embedder. The others are synchronous. Memory methods accept any unique id prefix of at least 6 characters, the way git accepts short hashes. v1 methods keep exact-id lookup.

### Recall

1. **Entry points.** `resolve(query)` candidates: exact content, alias, `aka` edges, tags, fuzzy match, and semantic match when an embedder is configured. Keep the top `k` (default 5) above a score floor.
2. **Spread.** Follow edges in both directions up to `depth` hops (default 2). A claim's score is the entry score times the edge weight times a per-hop decay (default 0.5). Default weights: `aka` 1.0; `implies`, `prerequisite-of`, `subset-of`, `derived-from` 0.8; `contradicts` 0.8 and always shown; `co-occurs-with` 0.5; custom types 0.6. A `supersedes` edge is followed to the newest claim in its chain. Weights are configurable.
3. **Filter.** Drop `superseded` and `retracted` claims unless `includeHistory` is set. With `asOf`, keep only claims whose validity window contains that time.
4. **Pack.** Render a tree rooted at the entry points. Add claims in score order until the budget is spent. A branch that does not fit becomes a handle. A claim uses its `summary` when its content does not fit.
5. **Return** the text plus structured `items`, so tools and evals can check what was included.

Token counts use the current estimate (characters / 4) unless a `countTokens` function is supplied. The same store, query, and options always produce the same text, which keeps evals stable.

### Outline format

```text
[k3f9a1] Access tokens expire after 15 minutes. (docs/auth.md, 2026-09-12; supersedes Ro0sql)
  -causes-> [jTZ2Lr] 401 responses mean the access token is missing or expired.
    -resolved-by-> [W3T0Hv] POST /auth/refresh exchanges a refresh token for a new access token.
  -handled-by-> [czeSw6] The web client refreshes tokens 5 minutes before expiry.
  -contradicts- [q7w8e9] The mobile client assumes 1-hour tokens. (no source)
3 more linked claims: expand k3f9a1
```

- `-type->` is an outgoing directed edge, `<-type-` an incoming one, and `-type-` an undirected one.
- Ids are the shortest unique prefix, minimum 6 characters.
- Source and date appear only when set. A claim without a source is marked, because provenance is how an agent weighs a claim.

### Out of scope

- Extracting claims from free text with an LLM. Callers and agents decide what to remember.
- Two-way sync with Markdown vaults.
- Task tracking.
- A vector index, transactions, or concurrent writers.
- General graph algorithms such as PageRank, community detection, or centrality.

## 4. Release sequence

Every breaking change ships in `4.0.0`, so users migrate once. The new memory API and the formats are additive, so they ship in minors, each behind its own eval gate. Sizes: S is up to 2 days, M up to a week, L up to 3 weeks. They are estimates.

### 3.1.0 (Hardening): minor, no breaking changes

Storage:

- `loadData` throws `RosemaryDataError` when the file is not valid JSON or has a newer `schemaVersion` than the library supports. The file and the in-memory state are left unchanged. The CLI prints the error with the file path and exits with code 1. (S1)
- Atomic writes: write a temporary file in the same directory, `fsync` it, then rename it over the target. (S2)
- `saveData()` writes when called directly, whatever `autoSave` says. Internal autosaves still respect `autoSave`. `initializeDefaultData` and `clearAllData` move to the internal path, so an `autoSave: false` store still never touches disk on its own. (S3)
- `batch(fn)` runs `fn` with autosave suspended and saves once at the end. It is not a transaction: if `fn` throws, earlier mutations stay in memory and the save is skipped. (S4)
- `onConflict: 'throw'` option: before a write, compare the file's size and modification time with the values recorded at the last load or save, and throw `RosemaryConflictError` if another process changed it. The default stays `'overwrite'` in 3.x. (S5)
- `logger` option (`{ info, warn, error }` or `null`). The default is unchanged. (A1)
- `getTotalConnections()` counts directed edges correctly. (G3)

Provider:

- `ClaudeProvider` in live mode requires `options.model` and throws a clear error without it. This replaces an API error from a retired model with a local one. Docs use a current model id and `ANTHROPIC_API_KEY`. (A6)

Packaging and docs:

- `files` drops `assets/`, `scripts/`, `examples/`, and `evals/`. The README logo uses an absolute URL. Tarball: 4.3 MB to about 44 KB. (P3)
- Correct the Express claim in `docs/non-goals.md`. Document `npm install --omit=optional rosemary-js` for 3.x users who do not need the HTTP API. (P1)
- Update `SECURITY.md`, add `## [Unreleased]` to `CHANGELOG.md`, and add Node 24, the eval, and a tarball check to CI. (R4)
- Tests write their fixtures under `os.tmpdir()` instead of the repository root. (R5)
- Release tooling as described in section 5. (R1, R2)

Tests: every item gets a regression test. The storage items get fault-injection tests: truncated file, temporary file left behind by a crash, and a file changed by another process between load and save.

Size: M.

### 4.0.0 (Foundation): major

Breaking changes to the environment and to behavior. Every v1.x `Rosemary` method keeps its signature.

- Node 22 or later. CI on 22, 24, and 26 (26 becomes LTS on 2026-10-28). Node 22 reaches end of life on 2027-04-30; dropping it is a 5.0.0 change. From Node 27 on, Node ships one major version a year and every one becomes LTS. (P4)
- Production dependencies: `fuse.js` only. The CLI uses `util.parseArgs`, `util.styleText`, and `readline/promises`. CSV reading and writing move to an internal RFC 4180 module with tests for quoting, embedded delimiters and newlines, CRLF, and a byte-order mark. `marked`, `dompurify`, and `jsdom` (for `getLeafContentAsHTML`) and `express`, `swagger-jsdoc`, and `swagger-ui-express` (for `rosemary-js/api`) become optional peer dependencies, loaded on first use with an install hint when missing. `node:http` replaces `http-server` for `Builder#build(path, { serve: true })`. (P1, P2)
- The library does not print. The default `logger` is silent. (A1)
- A new store starts empty. (A2)
- `importData` throws on invalid input. `onConflict` defaults to `'throw'`. (S5)
- `connectLeaves` and `connectDirectedLeaves` add a relationship instead of replacing the existing one. `disconnectLeaves(a, b, type?)` removes one. (G1)
- `getRelatedLeaves` and `bridge` also follow directed edges from target to source. `bridge` relationship records keep the stored direction. `infer` stays forward-only. Undirected edges, the only kind in v1.x, behave as before. (G2)
- `connectSimilarLeaves` stores `co-occurs-with` and keeps the shared tags in edge metadata. (G4)
- Schema version 3 (section 3). Version 2 files load unchanged. The first save writes version 3 and keeps a one-time `<file>.v2.bak`, because a 3.0.x process would drop the new fields on its next save. The 3.1.0 schema guard protects 3.1.x users.
- `stem.connections` becomes a read-only view derived from the edge records. Reading it works as before; writing to it directly is no longer supported.
- `cosineSimilarity` throws on vectors of different lengths. `RosemaryLLM#resolve` is typed as `Promise<ResolveResult>`. (A3, A4)
- `ClaudeProvider` takes an `@anthropic-ai/sdk` client (`new ClaudeProvider({ client, model })`) instead of calling `fetch` itself. The SDK brings credential lookup, retries, and typed errors, and it stays an optional peer dependency.
- The CLI follows the voice contract: no emoji, plain labels, and `--json` on every command that prints data. `add` accepts content and flags without prompting and only prompts in a terminal when called with no arguments. (V1)

Docs: `docs/upgrading-to-4.md` lists each behavior change with before and after.

Size: L.

### 4.1.0 (Memory): minor

- `rosemary-js/memory` with the API in section 3: `remember`, `supersede`, `retract`, `forget`, `recall`, `expand`, `history`, `conflicts`, `impact`, `audit`.
- The outline renderer and budget packing. (A5)
- A cached Fuse index and a tag index, invalidated on mutation. Today `resolve` takes about 45 ms at 2,000 leaves because it rebuilds the Fuse index on every call.
- Embedding cache: a sidecar file `<dataFile>.embeddings.json` keyed by leaf id and content hash and stamped with the embedder id and dimension. A mismatch triggers a rebuild instead of a silent comparison. (A3)
- CLI commands: `remember`, `recall`, `expand`, `supersede`, `retract`, `forget`, `conflicts`, `audit`, all with `--json`. An agent with a shell can use the store without MCP.
- A snippet for `AGENTS.md` and `CLAUDE.md` files that tells an agent when to remember, when to supersede, and to cite claim ids.
- Docs: `docs/memory.md`.
- Gate: the memory eval suite in section 6.

Size: L.

### 4.2.0 (Formats): minor

- Import the reference MCP memory server's JSONL file: entities become claims with their type in metadata, each observation becomes a claim linked to its entity, and relations become edges.
- Export nodes and edges as CSV without loss (metadata as a JSON column), and as graphology JSON for use with a graph library. (A7)
- Publish `schema/rosemary.schema.json`, a JSON Schema for the data file, and `docs/format.md`.
- Read-only Markdown export: one file per claim with front matter and `[[links]]`.

Size: M.

### rosemary-mcp: separate package

- Repository `luisfer/rosemary-mcp`, npm name `rosemary-mcp` (unclaimed on 2026-09-26). The core keeps zero MCP dependencies, as `docs/non-goals.md` requires.
- Tools mirror the memory API: `remember`, `recall`, `expand`, `supersede`, `retract`, `forget`, `conflicts`, `audit`.
- Built on the v2 TypeScript SDK (`@modelcontextprotocol/server`). It serves clients of both the 2025-11-25 and the current 2026-07-28 protocol revisions, loads with `require()`, and installs 3 packages; the v1 SDK (`@modelcontextprotocol/sdk`) installs 94.
- stdio transport. `--data-file` and `--read-only` flags. The default data file is in the project directory, never inside the package directory. The server reloads the store when the file changes on disk, so the CLI and the server can share it.
- The first version of a new npm package cannot be published through trusted publishing, so `0.1.0` is published once by hand with two-factor authentication.
- `0.1.0` against `4.1.0-rc.1`. `1.0.0` after `4.1.0`, gated on tool-level evals.

Size: M.

### Later (4.3.0 and after), each with its own eval first

- Candidate missing links in `audit()`: claims that are similar by embedding but have no path within 3 hops.
- An optional summarizer hook that fills `summary` for hub claims.
- Validity windows on edges.

### Order and gates

| Step | Output | Gate to the next step |
|---|---|---|
| 0 | This plan reviewed; the decisions in section 8 made | Maintainer sign-off |
| 1 | `3.1.0` | Regression tests for S1–S5, G3, and A6; CI green on Node 20, 22, and 24; eval green; tarball under 60 KB; released through the new flow |
| 2 | `4.0.0-rc.1` on `next` | Upgrade guide written; version 2 fixture files load and round-trip; install size and dependency checks pass |
| 3 | `4.0.0` on `latest` | Two weeks on `next` with no open data-loss or schema bugs |
| 4 | `4.1.0-rc.1` on `next`, `rosemary-mcp` `0.1.0` | Memory eval targets met; performance budgets met |
| 5 | `4.1.0` on `latest` | Two weeks of use as this repository's own agent memory (release rules, known failure modes, test commands); no API changes pending |
| 6 | `rosemary-mcp` `1.0.0`, `4.2.0` | Tool-level evals green against `4.1.0` |

If the spreading-activation recall in step 4 does not beat breadth-first packing at the same budget (section 6), ship `4.1.0` with breadth-first packing and keep the rest. Supersession, conflicts, and the outline format stand on their own.

## 5. Release mechanics

### Principles

- **Decide the version in a pull request.** The CHANGELOG heading `## [x.y.z] - YYYY-MM-DD` is the release decision, reviewed like any other change. (R2)
- **No irreversible step before every check has passed.** Tags and npm versions cannot be taken back cleanly; pull requests and branches can. (R1)
- **Publish from CI.** Reproducible, with provenance, and without a long-lived publish token on a laptop.
- **Every step is safe to re-run.** Each step checks whether its result already exists.

### Flow

`npm run release -- <patch|minor|major|x.y.z[-rc.n]>` on a laptop only prepares a release pull request. Nothing is tagged or published locally.

1. Refuse unless on `main`, the tree is clean, and `HEAD` equals `origin/main` after a fetch.
2. Compute the target version without writing anything. Refuse if tag `v<version>` exists locally or on origin, or if the version exists on npm.
3. Refuse if `## [Unreleased]` in `CHANGELOG.md` is empty.
4. Run `npm test`, the evals, and the tarball check: `npm pack --dry-run --json`, files limited to an allowlist, size under a budget.
5. Create branch `release/v<version>`. Move the `## [Unreleased]` entries under `## [<version>] - <date>` and leave an empty `## [Unreleased]` above it. Run `npm version <version> --no-git-tag-version`, commit `chore(release): <version>`, push the branch, and print the pull request link.

The release pull request shows the version and its CHANGELOG section in one diff, and CI runs the same checks on it. After it is merged, `.github/workflows/release.yml` runs on the push to `main`:

1. Read the version from `package.json`. If that version is on npm and has a GitHub Release, stop. This is the common case: most pushes to `main` do not change the version.
2. Verify the heading `## [<version>]` in `CHANGELOG.md`, matched exactly rather than by substring. Run the tests and evals.
3. Smoke test the package before it is public: `npm pack`, install the tarball into an empty directory, `require` every entry in the `exports` map, and run the CLI's help command.
4. Create and push the annotated tag `v<version>` on the merge commit if it does not exist. If it exists, it must point at this commit.
5. If the version is not on npm: `npm publish --access public`, adding `--tag next` when the version has a prerelease part. Authentication uses npm trusted publishing (OIDC), so there is no `NPM_TOKEN` secret, and npm attaches provenance automatically. Trusted publishing needs npm 11.5.1 or later on Node 22.14 or later, a GitHub-hosted runner, and `id-token: write` in the job permissions. Node 22 ships npm 10, so the job runs on Node 24 or upgrades npm first.
6. Create the GitHub Release if it is missing, with the CHANGELOG section as its body. Generated notes do not follow the voice contract; the CHANGELOG does.

If a step fails, fix the cause and re-run the workflow. Steps whose result already exists are skipped.

`prepublishOnly` stays as a second guard for any manual publish.

### Versioning and support

- Majors only for breaking changes. (R3)
- Prereleases are `x.y.z-rc.n` on the `next` dist-tag. `latest` moves only on a final release.
- After `4.0.0`, the 3.x line receives security and data-loss fixes for six months. `SECURITY.md` states this.

### Repository settings (manual, by the maintainer)

- On npmjs.com: add the trusted publisher for `rosemary-js` (repository `luisfer/rosemary-js`, workflow file `release.yml`). Publisher configurations created after 2026-09-03 allow only staged publishing by default. Either also allow `npm publish`, or keep staging and approve each release with `npm stage approve` and two-factor authentication, which adds a human check on the exact tarball CI built. Then set publishing access to require two-factor authentication and disallow tokens; publishing through OIDC keeps working.
- On GitHub: protect `main` and require the CI checks before merge.

## 6. Evals and acceptance criteria

`evals/memory.json` extends the existing agent-context suite. It is deterministic and runs in CI.

| Check | Target |
|---|---|
| Currentness: after `supersede`, recall shows the new claim and not the old one unless `includeHistory` is set | 100% |
| Conflicts: an active `contradicts` pair appears in any recall that includes either claim | 100% |
| Multi-hop: the answer claim, 2 typed hops from the entry claim, appears in the pack at the task's budget | at least 90%, and at least 20 points above breadth-first packing at the same budget |
| Token cost: outline tokens compared with concise JSON for the same items | at most 60% |
| Duplicates: `remember` of an exact or alias duplicate returns `duplicateOf` | 100% |
| Durability: truncated file, crash between the temporary write and the rename, and a file changed by another process | no previously saved claim lost: 100% |
| Silence: library calls in a child process write nothing to stdout or stderr | 0 bytes |
| Determinism: the same inputs produce the same pack text | 100% |

Performance budgets, set from a baseline measurement in step 1 and then enforced in CI:

| Operation | Starting budget |
|---|---|
| `recall` p95, 5,000 claims, no embedder | 25 ms |
| `loadData`, 10,000 claims | 300 ms |
| 10,000 `remember` calls inside `batch` | 1 s |

Packaging checks, enforced in CI from `4.0.0`:

| Check | Target |
|---|---|
| Packed tarball | under 100 KB |
| Production dependencies | `fuse.js` only |
| `npm install rosemary-js` into an empty directory | no `express`, `jsdom`, or `inquirer` |

## 7. Proposed edits to direction and non-goals

`docs/direction.md`: replace the numbered items with this direction and the release sequence. Remove the CommonJS to ESM item: once `chalk`, `marked`, and `jsdom` leave the core dependencies, nothing forces the migration, and Node 22.12 or later loads synchronous ES modules through `require()` without a flag.

`docs/non-goals.md`:

| Item | Change |
|---|---|
| A database | Add: "Atomic single-file writes and detection of changes made by another process are in scope. Concurrent writers are not." |
| A vector database | Add: "Embeddings may be cached in a sidecar file keyed by content hash and embedder id." |
| A web framework | Correct: `optionalDependencies` are installed by default. From 4.0.0 these packages are optional peer dependencies, installed only on request. |
| A schema system | Amend: "A small set of reserved leaf fields (`source`, `validFrom`, `validTo`, `status`, `confidence`, `summary`) has defined meaning, like the reserved edge vocabulary. There is no validator for user fields." |
| A graph algorithms library | Amend: "Recall uses bounded, typed spreading activation from resolved entry points. No general algorithm suite (PageRank, community detection, centrality) is exposed." |
| New item | "An extraction pipeline. Rosemary does not turn free text into claims. Callers and agents decide what to remember." |

## 8. Decisions needed

| # | Question | Recommendation |
|---|---|---|
| 1 | Release train: `4.0.0` Foundation followed by `4.1.0` Memory, or one large `4.0.0` | Two releases. Users migrate once, and the new API gets its own release candidate. |
| 2 | Where the memory API lives | A new `rosemary-js/memory` entry point, not more methods on `Rosemary`. |
| 3 | Method names | `remember`, `recall`, `expand`, `supersede`, `retract`, `forget`. They match `docs/direction.md` and the MCP prototype. |
| 4 | Direct writes to `stem.connections` | Unsupported from 4.0.0; reads keep working through a derived view. |
| 5 | CLI `hello` and `rosemary` commands | Remove them. Their output conflicts with the voice contract. |
| 6 | HTTP API (`rosemary-js/api`) | Keep, maintenance only, with optional peer dependencies. MCP covers agent access. |
| 7 | Format of the new time fields | ISO 8601 strings. They are readable in a diff and by a model. |
| 8 | `rosemary-mcp` home | A separate repository and npm package, per `docs/non-goals.md`. |
| 9 | Trusted publishing | Enable it before `3.1.0`. It needs the npmjs.com setting in section 5. |
| 10 | Release flow | A release pull request plus CI publishing (section 5). The smaller alternative is to keep the local `npm run release` and move every check before `npm version`. It fixes R1 but keeps publishing on a laptop, and npm removes direct publishing with granular access tokens in January 2027. |

## Appendix: reproduction

Environment: Node 22.22.2, npm 10.9.7, repository at `a22f134`, `npm ci` completed.

- Tests: `npx jest` reports 7 suites, 57 tests passed. `npm run eval:agent-context` reports 4 passed, 0 failed.
- Install size: `npm pack`, then `npm install ./rosemary-js-3.0.2.tgz` into an empty project: 235 packages, 76 MB, with `express`, `http-server`, `swagger-jsdoc`, and `swagger-ui-express` present. With `--omit=optional`: 121 packages, 43 MB; the largest are `rxjs` (12 MB), `lodash`, and `jsdom`.
- Tarball: `npm pack --dry-run` reports 4.3 MB packed, 50 files. With `assets`, `scripts`, `examples`, and `evals` removed from `files`: 43.8 KB packed, 31 files.
- Registry and tags: `npm view rosemary-js versions` lists `1.0.0` through `3.0.2` with no `2.1.0`; `git ls-remote --tags origin` lists `v2.0.0`, `v3.0.0`, `v3.0.1`, and `v3.0.2`. For each of those four, `npm view rosemary-js@<version> gitHead` equals the tagged commit.
- Exports: in the installed package, `require('rosemary-js/scripts/visualize.js')`, `require('rosemary-js/examples/mcp/rosemary-mcp-prototype.js')`, and `require('rosemary-js/evals/agent-context.json')` fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`, so removing those directories from `files` changes nothing a consumer can load.

Probes, each run against `src/` with `console.log` captured:

1. `new Rosemary({ dataFile, autoSave: false })`, `addLeaf`, `saveData()`: no file is written.
2. Save 2 leaves, truncate the file by 3 bytes, `loadData()`, `addLeaf`: 0 leaves after load, 1 leaf in the file.
3. `loadData()` on a missing file and 2 `addLeaf` calls: 6 `console.log` calls; the file holds the welcome leaf plus the 2 new ones.
4. `connectDirectedLeaves(a, b, 'implies')`, then `connectDirectedLeaves(a, b, 'co-occurs-with')`: `stem.toJSON()` holds only `co-occurs-with`.
5. Three directed edges: `getTotalConnections()` returns `1.5`.
6. 2,000 `addLeaf` calls with autosave: 2,610 ms, 517 KB file. `fuzzySearch` 18 ms per call and `resolve` 45 ms per call at that size.
7. `Rosemary#resolve` returns an object; `RosemaryLLM#resolve` returns a Promise.
8. `RosemaryLLM` with a counting embedder: 3 calls while adding 3 leaves; after a reload, one `semanticSearch` makes 4 more (3 re-embeds and the query).
9. `createCsvRecords()` columns: `id, content, tags, createdAt, lastModified`.
10. `connectDirectedLeaves(algebra, calculus, 'prerequisite-of')`: `getRelatedLeaves(calculus)` returns `[]` and `bridge(calculus, algebra)` returns `null`. `connectSimilarLeaves(1)` on two leaves tagged `t1, t2` stores the type `Common tags: t1, t2`.
11. Ten auth-related leaves and nine typed edges; the depth-3 pack around the first leaf covers 9 of them. `buildPromptContext` detailed JSON: 2,931 characters. Concise JSON: 1,508. A plain outline of the same 9 leaves with ids and relationship labels: 743. The facts alone: 440.

### External sources

Checked on 2026-09-26. Where a documentation site was not reachable, the page's source file in its GitHub repository was read instead.

- npm trusted publishing, staged publishing, and access tokens: `npm/documentation` on GitHub (`trusted-publishers.mdx`, `staged-publishing.mdx`, `about-access-tokens.mdx`); GitHub community discussions 178140, 179562, and 201329.
- npm prerelease tag check (npm 11.0.0) and npm 12 requirements: `npm/cli` `CHANGELOG.md` and `lib/commands/publish.js`.
- Node.js release schedule and the change to yearly majors from Node 27: `nodejs/Release` (`schedule.json`); nodejs.org announcement "Evolving the Node.js release schedule".
- Node API history (`require(esm)`, `util.styleText`, `util.parseArgs`, `readline/promises`): `doc/api/*.md` in `nodejs/node`.
- MCP stdio rule and protocol revisions: `modelcontextprotocol/modelcontextprotocol` (`docs/specification/2026-07-28/basic/transports/stdio.mdx`, `basic/versioning.mdx`).
- MCP TypeScript SDK v1 and v2: `modelcontextprotocol/typescript-sdk` and the npm registry.
- Reference MCP memory server: `modelcontextprotocol/servers`, `src/memory`, and the published `@modelcontextprotocol/server-memory` tarball.
- Other tools in the prior-art table: their GitHub repositories (`getzep/graphiti`, `mem0ai/mem0`, `letta-ai/letta-code`, `basicmachines-co/basic-memory`, `topoteretes/cognee`, `WujiangXu/A-mem`, `OSU-NLP-Group/HippoRAG`, `microsoft/graphrag`, `steveyegge/beads`, `CaviraOSS/LongMemory`, `YonasValentin/mcp-memory-graph`, `aexy-io/graphzep`) and the Anthropic memory tool documentation.
- Model retirement: Anthropic's model deprecations table (`claude-3-5-sonnet-20240620`, retired 2025-10-28).
- Context engineering: Anthropic, "Effective context engineering for AI agents" (2025-09-29). Chroma, "Context Rot" (2025), and `chroma-core/context-rot`.
