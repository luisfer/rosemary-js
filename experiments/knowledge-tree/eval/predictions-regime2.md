# Regime 2 predictions (written before any Regime 2 run, 2026-09-26)

Change from Regime 1: conditions B2 and C2 are told to rely on their notes.
- B2 adds: "Treat these notes as your project memory: when they answer the question, answer from them; read repository files only for what the notes do not cover."
- C2 adds: "Treat the tree as your project memory: when a fresh note answers the question, answer from it; read repository files only when a note is stale or does not cover the question."
A is not rerun (it has no notes).

Predictions:
1. B2 gives stale answers on 4 to 6 of the 8 "answer changed" questions (max_tokens, node_version, test_files, stats_command, release_order, remove_connection are covered by outdated notes).
2. C2 gives 8 of 8 correct answers on "answer changed" questions, because the notes involved are flagged stale.
3. On the 7 "untouched, note fresh" questions, C2 uses fewer tokens than A on average.
4. Over all 22 questions, C2 uses fewer tokens than C (Regime 1).
5. B2 is the cheapest condition overall.

The idea passes this regime if predictions 1 and 2 hold and C2 costs no more than A overall.
