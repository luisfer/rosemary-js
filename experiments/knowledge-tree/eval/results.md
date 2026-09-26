# Results

Run on 2026-09-26. Experiment 1 numbers come from `runs.jsonl`, `grades.json`, and `node analyze.js`. Experiment 2 numbers come from `runs2.jsonl`, `grades2.json`, and `node analyze2.js`. Experiment 3 (`runs3.jsonl`) is being graded; its section will follow.

Every answer run was one agent with an empty context, answering one question, on the same model. Experiments 1 and 2 used `grow.js` as of commit 947463c; experiment 3 used it as of commit a22c955.

## Summary

| Experiment | Questions | What it showed |
|---|---|---|
| 1 | 22 lookups, each answered from one or two files | Reading the files was cheapest. No condition gave an outdated answer, because the agents checked notes against the files. |
| 2 | 8 questions that need several files, in two states of the repository | The tree saved tokens only when the agent found and trusted the stored answer. The notes file gave one outdated answer after a change; the tree gave none. |

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

## Experiment 2: questions that need several files

### Question

Experiment 1 asked lookups that are cheap to answer from the files. A stored answer can only save work when working the answer out again is expensive. Does the tree save work on such questions when its notes are valid, and does it prevent outdated answers when they are not?

### Setup

- Eight questions whose answers need several files or a search across the repository (`questions2.json`): which methods change data without saving, which typed methods no test calls, which CLI commands the README misses, where each entry point gets its data file, how three layers handle bad `connect` input, the release steps in order, which `RosemaryLLM` methods the docs leave out, and how context scoring and pruning work.
- The stored answer to each question (`answers2.js`), written the way an agent would save it after answering the first time: the answer and the files it came from. The notes from experiment 1 were kept, so the tree has 37 notes.
- Two states of the repository (`setup2.js`):
  - s0: the repository as the notes describe it. Every note is fresh.
  - s1: after three changes: a `renameTag` method that changes tags without saving, declared in `index.d.ts` and not tested; a `stats` CLI command the README does not list; and a test file in a new folder that calls `exportToJSON` and `updateLeaf`. In s1, three stored answers are wrong and flagged stale ("changed"), two are flagged stale but still right ("touched"), and three are fresh.
- Conditions A, B2, and C2 from experiment 1, with answers of up to 5 sentences. One run per question, state, and condition: 48 runs.
- Two blind graders, as in experiment 1. They agreed on all 48 grades.
- Predictions were committed before the first run (`predictions2.md`).

### Results

| State | Condition | Tokens, mean | Over A, mean | Tool calls, mean | Runs that read no repository file | Correct | Partial | Stale |
|---|---|---|---|---|---|---|---|---|
| s0 | A: no notes | 64,157 | - | 5.6 | 0 | 7 | 1 | 0 |
| s0 | B2: notes file | 64,801 | +644 | 2.5 | 3 | 8 | 0 | 0 |
| s0 | C2: tree | 59,964 | -4,193 | 5.8 | 5 | 7 | 1 | 0 |
| s1 | A: no notes | 67,118 | - | 5.5 | 0 | 6 | 2 | 0 |
| s1 | B2: notes file | 65,423 | -1,694 | 4.6 | 2 | 7 | 0 | 1 |
| s1 | C2: tree | 68,787 | +1,670 | 11.3 | 2 | 8 | 0 | 0 |

No answer was graded incorrect. The partial answers left out a step or a case: two release checks, or the API case where both ids are missing.

In s1, by what happened to the stored answer (tokens over A, mean):

| Stored answer in s1 | B2 | C2 |
|---|---|---|
| Changed, flagged stale (3 questions) | +1,533 | +9,996 |
| Unchanged, flagged stale (2) | -12,558 | -9,514 |
| Fresh (3) | +2,321 | +798 |

### Findings

1. In s0, the tree saved tokens when the agent used the stored answer. C2 answered 5 of 8 questions from the tree alone, and on the three most expensive questions it used 6,800 to 21,300 fewer tokens than A. On the other 3 it read the files anyway. In one of them the agent said it found only the file summaries: the 400-token map showed 1 of the 10 stored answers and hid the rest behind `expand answers`. Overall, C2 was cheaper than A on 3 of 8 questions (mean -4,193; interval -10,866 to +1,695).
2. The notes file cost about the same as no notes in s0 (+644). The agent reads the whole file first, about 3,600 tokens, and then usually checked the files anyway. The tree was cheaper than the notes file on 7 of 8 questions (-4,837; interval -10,080 to -344).
3. The notes file gave one outdated answer. In s1, B2 listed the five methods from the stored answer and left out `renameTag`, although it read `src/Rosemary.js`. The new method is 20 lines in a 1,055-line file. B2 caught the other two changed answers.
4. The tree gave no outdated answer. In s1, C2 re-derived all five answers flagged stale from the files.
5. Re-deriving was expensive. On the three changed answers, C2 used about 10,000 more tokens than A: it read the tree, then did all of A's work. Nothing told the agent what had changed, only that something had.
6. Predictions (`predictions2.md`):

| Prediction | Result |
|---|---|
| 1. In s0, C2 is cheaper than A on 6 of 8 questions and by 2,000 tokens on average | Failed: 3 of 8, although -4,193 on average |
| 2. In s0, C2 answers 4 of 8 without reading a repository file | Held: 5 of 8 |
| 3. In s0, no condition has more than one stale or incorrect answer | Held: none |
| 4. In s1, C2 gives no outdated answer to the 3 changed questions | Held |
| 5. In s1, B2 gives at least one outdated answer to them | Held: 1 |
| 6. In s1, C2 is cheaper than A on the 3 fresh questions | Failed: +798 |
| 7. Over both states, C2 is cheaper than B2 | Held, not significant: -736 (interval -5,142 to +4,664) |

By the rules written in advance, the tree did not show potential (prediction 1 failed), and freshness tracking did add something over plain notes (predictions 4 and 5 held).
