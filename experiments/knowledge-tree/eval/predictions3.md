# Experiment 3 predictions

Written before any experiment 3 run, 2026-09-26. Experiment 3 is exploratory: it tests changes suggested by experiment 2, on the same eight questions and the same two states.

## What changed

Experiment 2 showed two problems with the tree:

- Agents missed stored answers. The 400-token map showed 1 of the 10 and left the rest behind `expand answers`. That list did not show which answers were stale.
- A stale note was re-derived from scratch, because nothing showed what had changed.

Changes to `grow.js`:

1. `read` lists every stored answer (`q:` notes) first, one line each, with its status. The outline of the other notes fills the rest of the budget.
2. `expand` shows the status of each branch.
3. Each note keeps a snapshot of its sources when it is written or confirmed (`.rosemary/snapshots/`). `why` prints a diff of each changed source since the note was written, and the paths added to or removed from a `glob:` source.

Condition C3 uses the C2 prompt with two edits (`prompts.md`): the sentence about stale notes says that `why` shows what changed, and the help line for `why` says the same. The repository copies come from `setup2.js`, so the tree has snapshots.

C3 is compared with the A and C2 runs from experiment 2.

## Predictions

1. In s0, C3 answers at least 7 of the 8 questions without reading a repository file.
2. In s0, C3 uses fewer tokens than A on at least 6 of the 8 questions.
3. In s1, C3 gives no outdated answer to the three questions whose answer changed.
4. In s1, C3 uses fewer tokens than C2 on at least 4 of the 5 questions whose note is stale.
5. Over both states, C3 uses fewer tokens than A on average.

The changes work if predictions 1, 3, and 4 hold.
