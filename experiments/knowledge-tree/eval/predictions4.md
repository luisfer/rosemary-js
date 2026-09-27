# Experiment 4 predictions

Written before any experiment 4 run, 2026-09-27.

## Design

In experiments 2 and 3, the stored answers were written in advance by the agent that set up the experiment. In real use, agents write and maintain their own memory while the code changes. Experiment 4 tests that loop.

- Twelve sessions in a row (`questions4.json`), each one agent with an empty context answering one question. Four questions from experiment 2 come back two to four times: which methods change data without saving, which typed methods no test calls, where each entry point gets its data file, and which CLI commands the README misses.
- The code changes three times between sessions (`changes.js`): before session 5 (c1, `renameTag`), session 7 (c2, `stats`), and session 9 (c3, a test file in a new folder). Three sessions ask a question whose answer changed since it was last asked (5, 8, 9). Two ask one whose inputs changed but whose answer did not (6, 11). Three repeat a question with nothing changed (4, 10, 12).
- Conditions (`prompts.md`):
  - A: no memory.
  - B: a `NOTES.md` file that the agents read first and update after answering.
  - C: the knowledge tree from experiment 3, empty at the start, that the agents read first and update with `write` and `confirm`.
- Three independent timelines per condition: 108 sessions. Memory state is recorded before each session (`memory.jsonl`). Grading is blind, as before.

## Predictions

1. Over the twelve sessions, C uses fewer tokens in total than A, on average over the three timelines and in at least two of them.
2. On the three repeats with nothing changed (sessions 4, 10, 12), C uses fewer tokens than A in at least 7 of 9 runs.
3. On the three sessions whose answer changed (5, 8, 9), C gives no outdated answer (0 of 9).
4. On those sessions, B gives at least 2 outdated answers out of 9.
5. The agents' own source lists are good enough: at the start of sessions 5, 8, and 9, the tree flags the stored answer to the question as stale in at least 8 of 9 cases.
6. Over the twelve sessions, C uses fewer tokens in total than B on average.

The tree shows value in real use if predictions 1, 3, and 5 hold. Freshness tracking adds something over a maintained notes file if predictions 3 and 4 hold.
