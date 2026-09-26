# Results

Run on 2026-09-26. Numbers come from `runs.jsonl`, `grades.json`, and `node analyze.js`.

## Experiment 1: lookups after the code changed

### Question

An agent answers a question about a repository that changed after its notes were written. Does it do better with the knowledge tree than with no notes, or with the same notes as one file and no freshness information?

### Setup

- Repository: this one, without `experiments/`. 37 files, about 55,000 tokens.
- Notes: the 30 notes in `notes.js`, written against the unchanged files. As one Markdown file they are about 2,400 tokens.
- Eight changes made after the notes were written (`setup.js`): a CHANGELOG check in the release script, `Stem#removeConnection`, an integration test in a new folder, a new `maxTokens` default, a new fuzzy-search threshold, a fifth transitive edge type, Node 22 in `engines`, and a `stats` CLI command.
- 22 questions (`questions.json`):
  - 8 whose answer changed. The tree flags each note involved as stale.
  - 7 whose answer did not change, but whose note is flagged stale because its file changed.
  - 7 whose note is fresh.
- Conditions (`prompts.md`):
  - A: the repository only.
  - B: the notes as one file.
  - C: the tree, starting from a 400-token map.
  - B2 and C2: the same as B and C, with one more sentence telling the agent to use the notes as project memory and to answer from them when they cover the question. For C2, only fresh notes qualify.
- One run per question and condition: 110 runs and one control run. Every run started with an empty context.
- Two graders worked blind. They saw separate shuffles, and sentences that mentioned the notes or the tree were removed from the answers. They agreed on 109 of 110 grades.

### Results

| Condition | Tokens, mean | Over A, mean | Tool calls, mean | Seconds, mean | Correct | Partial | Stale | Incorrect |
|---|---|---|---|---|---|---|---|---|
| A: no notes | 54,562 | - | 2.3 | 17.7 | 22 | 0 | 0 | 0 |
| B: notes file | 59,345 | +4,783 | 3.6 | 25.1 | 22 | 0 | 0 | 0 |
| C: tree | 57,346 | +2,784 | 5.0 | 35.2 | 22 | 0 | 0 | 0 |
| B2: notes file, used as memory | 58,693 | +4,132 | 2.9 | 26.0 | 21 | 1 | 0 | 0 |
| C2: tree, used as memory | 56,969 | +2,408 | 4.7 | 37.7 | 21 | 1 | 0 | 0 |

Tokens are the size of the agent's context at the end of a run. About 52,500 of that is fixed: system prompt and tool definitions. Paired differences on the same question, with 95% bootstrap intervals:

| Comparison | Cheaper in | Mean difference |
|---|---|---|
| C2 vs A | 2 of 22 | +2,408 (+1,359 to +3,413) |
| B2 vs A | 2 of 22 | +4,132 (+3,169 to +4,951) |
| C2 vs B2 | 18 of 22 | -1,724 (-2,605 to -871) |
| C vs B | 17 of 22 | -1,999 (-2,960 to -1,004) |
| C2 vs C | 12 of 22 | -376 (-1,113 to +336) |

### Findings

1. No condition gave an outdated answer. That includes B and B2, whose notes were wrong on 8 answers and did not say so.
2. The agents checked the notes against the files. Four of the eight B2 answers to changed questions say that the notes are out of date. Checking is cheap here: most answers sit in one or two files, and reading them costs 1,000 to 2,000 tokens.
3. Reading the files directly (A) was the cheapest and fastest condition. The tree added about 2,400 tokens, twice the tool calls, and twice the time per question. The notes file added about 4,100 to 4,800 tokens.
4. The tree cost about 2,000 tokens less than the notes file. The agent reads a 400-token map and one note instead of the whole file.
5. The agents used the stale flags. In C and C2, answers to changed questions cite the flag as the reason to read the file. They seldom relied on fresh notes: C2 answered from the tree alone on 2 of the 7 fresh-note questions.
6. Predictions written before Regime 2 (`predictions-regime2.md`):

| Prediction | Result |
|---|---|
| 1. B2 gives 4 to 6 outdated answers on the 8 changed questions | Failed: 0 |
| 2. C2 answers all 8 changed questions correctly | Held: 8 of 8 |
| 3. C2 uses fewer tokens than A when the note is fresh | Failed: +3,309 on average |
| 4. C2 uses fewer tokens than C | Not shown: -376, interval includes 0 |
| 5. B2 is the cheapest condition | Failed: A is |

The pass rule was that predictions 1 and 2 hold and C2 costs no more than A. It did not pass.

### What this shows

When the answer is in one or two small files, reading them is about as cheap as reading a note, and it cannot be out of date. Notes of any kind add cost. An agent that checks what it reads catches outdated notes by itself, so freshness tracking has no errors left to prevent.

This experiment did not test the cases the tree is meant for:

- answers that are expensive to derive: many files, or a search across the codebase
- notes that record something the files do not say
- agents that trust notes without checking them
