# Knowledge tree (experiment)

Not part of the published package. Requires Node 22 or later.

An agent that reads a codebase or a set of documents builds an understanding of it. That understanding is lost when the session ends, or it is saved in notes that go stale without anyone noticing. This experiment keeps it as a tree of notes, and each note records what it was derived from.

- A note is text an agent wrote: a file summary, a folder overview, or the answer to a standing question.
- Each note records its inputs and their hashes. Inputs are source files, the result of a file search (`glob:<pattern>`), or other notes.
- When an input changes, `todo` lists the notes to refresh now and the notes to re-check after that, in dependency order.
- If a note still holds after a re-check, the agent confirms it. Its text stays the same, so the notes built on it stay fresh.
- `read --budget N` lists the stored answers first, one line each with its status, then prints the other notes as an outline that fits N tokens. A branch that does not fit ends in `expand <id>`.
- Each note keeps a snapshot of its sources. When a note is stale, `why` prints a diff of what changed since it was written, so the agent can check the change instead of re-reading every source.
- The library never calls a model. The agent that reads the files writes the notes.

## Demo

```bash
node experiments/knowledge-tree/demo.js
```

The demo copies the repository at `HEAD` into a temporary directory and writes the 30 notes in `notes.js`. Those notes were written by Claude after reading the files. The demo then makes three changes and prints what the tree reports after each one.

Results at the commit that added this directory (token counts are characters divided by 4):

| Measure | Result |
|---|---|
| Notes | 30, over 37 files |
| Source size | about 55,000 tokens |
| All notes | about 2,300 tokens |
| Map read at the start of a session | about 390 tokens (budget 400) |
| Change 1: `Stem.js` gains `removeConnection` | 1 note rewritten, 2 confirmed, 27 untouched, including the project overview |
| Change 2: `release.js` checks the CHANGELOG before tagging | the stored answer about releases became false and was flagged; 2 notes rewritten, 1 confirmed |
| Change 3: a test file added in a new folder | the answer "no tests outside src/_tests_/" was flagged |
| "What happens when a release runs?" | about 2,670 tokens of reading from the files, or about 97 tokens from the stored answer |

## Commands

```bash
node experiments/knowledge-tree/grow.js todo    --dir <repo>
node experiments/knowledge-tree/grow.js read    --dir <repo> --budget 800
node experiments/knowledge-tree/grow.js expand  <id> --dir <repo>
node experiments/knowledge-tree/grow.js why     <id> --dir <repo>
node experiments/knowledge-tree/grow.js write   <id> --dir <repo> --spec note.json
node experiments/knowledge-tree/grow.js confirm <id> --dir <repo>
node experiments/knowledge-tree/grow.js sizes   --dir <repo>
```

A note is in one of three states:

- `fresh`: its inputs match what it was built from.
- `stale`: an input changed.
- `waiting`: its inputs match, but a note it uses is stale.

The tree is stored in `<repo>/.rosemary/tree.json`, and the source snapshots in `<repo>/.rosemary/snapshots/`.

## Related work (checked 2026-09-26)

- LangChain OpenWiki checks wiki claims against SHA-256 hashes of files and line ranges. Its evidence cannot cite generated pages, so an overview page does not go stale when the pages under it change.
- CodeWiki 2.0 cascades updates up a fixed module tree. It does not use content hashes, and it covers code only.
- llm-wiki-compiler hashes sources per page, one level deep. It marks saved query pages as always unverified.
- DVC and Dagster skip downstream work when inputs are unchanged (early cutoff). They do this for data pipelines, not for notes written by a model.
- Google's Open Knowledge Format v0.2 leaves `derived_from` lineage out of scope.

## Limits of this prototype

- Hashes are per file, so any edit to a file flags its note. `confirm` is the cheap answer when the edit does not matter.
- Freshness is not correctness. A wrong note stays wrong until its inputs change or someone reviews it.
- Source hashes are recomputed on every command. A real implementation would cache them by size and modification time.
- Snapshots copy every source file. In a git repository, a real implementation would record the commit and read old versions from git.
- `eval/` compares agents with the tree, with the same notes as one file, and with no notes, in three experiments. For lookups that one or two files answer, reading the files was cheapest. For questions that need several files, the tree with its current commands used fewer tokens than reading the files on 15 of 16 question and state pairs and gave no outdated answer; the notes file gave one. Experiment 3 is exploratory, with one run per cell. See `eval/results.md`.
