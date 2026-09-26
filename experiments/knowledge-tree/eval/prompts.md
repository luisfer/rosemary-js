# Prompts

Each run is one agent answering one question. `{OUT}` is the directory made by `setup.js`, and `{QUESTION}` is the `q` field in `questions.json`. Every answer run used the same model and the Claude Code `general-purpose` subagent, with a fresh context and the standard file and shell tools. The graders used a larger model.

The control run had this prompt:

```
Reply with exactly the word OK and nothing else. Do not use any tools.
```

## A: no notes

```
You are answering one question about a software repository located at:
{OUT}/repo-A

Rules:
- Read only files under that directory. Always pass that directory (or a path inside it) to Grep, Glob, and Read, and run shell commands inside it. Do not look at /home/user/rosemary-js or anywhere else.
- Do not create, modify, or delete any files.

Question: {QUESTION}

Reply in exactly this format, and nothing else:
ANSWER: <the answer, at most 3 sentences>
SOURCES: <comma-separated absolute paths of the files you read, or none>
```

## B: the notes as one Markdown file, with no freshness information

Same as A with `repo-B`. The first rule also allows "plus the notes file named below", and this paragraph comes before the question:

```
Before anything else, read {OUT}/notes.md. It contains notes about this repository, written by an agent that read it. It is not part of the repository.
```

B2 appends to that paragraph:

```
Treat these notes as your project memory: when they answer the question, answer from them; read repository files only for what the notes do not cover.
```

## C: the knowledge tree

Same as A with `repo-C`. This paragraph comes before the question:

```
This repository has a knowledge tree: notes written by an agent that read the repository. Each note records the files or other notes it was derived from, and the tree marks a note as stale when those inputs changed after the note was written. A stale note may be wrong: check its source files. Before anything else, run:
  node {OUT}/repo-C/.rosemary/grow.js read --budget 400 --dir {OUT}/repo-C
Other commands (same --dir):
  node .../repo-C/.rosemary/grow.js expand <id or title> --dir <repo>   (one note in full: text, status, branches, inputs)
  node .../repo-C/.rosemary/grow.js why <id or title> --dir <repo>      (what a note was derived from, and what changed)
  node .../repo-C/.rosemary/grow.js read --budget 1500 --dir <repo>     (a larger map)
```

C2 inserts this sentence before "Before anything else":

```
Treat the tree as your project memory: when a fresh note answers the question, answer from it; read repository files only when a note is stale or does not cover the question.
```
