# Experiment 2 predictions

Written before any experiment 2 run, 2026-09-26.

## Design

- Eight questions whose answers need several files or a search across the repository (`questions2.json`). The stored answer to each one is in `answers2.js`.
- Two states of the repository (`setup2.js`):
  - s0: the repository as the notes describe it. Every note is fresh.
  - s1: after three changes: a new `renameTag` method that does not save and has no test, a `stats` CLI command, and a new test file. In s1, three stored answers are wrong and flagged stale, two are flagged stale but still right, and three are fresh.
- Conditions, with the prompts from experiment 1 (`prompts.md`). The only change is that answers may run to 5 sentences.
  - A: no notes.
  - B2: the notes as one file, used as project memory.
  - C2: the tree, used as project memory.
- One run per question, state, and condition: 48 runs. Grading and analysis as in experiment 1.

## Predictions

1. In s0, C2 uses fewer tokens than A on at least 6 of the 8 questions, and at least 2,000 fewer on average.
2. In s0, C2 answers at least 4 of the 8 questions without reading a repository file.
3. In s0, no condition gets more than one answer graded stale or incorrect.
4. In s1, C2 gives no outdated answer to the three questions whose answer changed.
5. In s1, B2 gives at least one outdated answer to those three questions.
6. In s1, on the three questions whose note is still fresh, C2 uses fewer tokens than A on average.
7. Over both states, C2 uses fewer tokens than B2 on average.

The tree shows potential if predictions 1 and 4 hold. Freshness tracking adds something over plain notes if predictions 4 and 5 both hold.
