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

## C3: the tree with answer listing and diffs (experiment 3)

Same as C2, with `grow.js` from the commit that added `predictions3.md`. Two sentences differ. In the paragraph, "A stale note may be wrong: check its source files." becomes:

```
A stale note may be wrong: `why` shows what changed in its sources since it was written, so you can check whether the change affects the note.
```

The help line for `why` becomes:

```
  node .../repo-C/.rosemary/grow.js why <id or title> --dir <repo>      (what a note was derived from, and a diff of what changed since it was written)
```

## Experiment 2 and 3 answers

Experiments 2 and 3 use `{OUT}/s0/` or `{OUT}/s1/` in place of `{OUT}/`, the notes file is `{OUT}/notes.md`, and the answer may run to 5 sentences instead of 3.

## Experiment 4: agents keep their own memory

Each session is one agent with an empty context. `{REPO}` is the timeline's repository copy, `{ANS}` the file the agent writes its reply to, and `{QUESTION}` the question from `questions2.json`. Memory carries over between sessions only through `NOTES.md` (B) or `.rosemary/` (C).

### A4: no memory

```
You are answering one question about a software repository located at:
{REPO}

Rules:
- Read only files under that directory. Always pass that directory (or a path inside it) to Grep, Glob, and Read, and run shell commands inside it. Do not look at /home/user/rosemary-js or anywhere else.
- Do not create, modify, or delete any files, except the answer file named at the end.

Question: {QUESTION}

When you are done, write your reply to {ANS}, then reply with the same text. Use exactly this format, and nothing else:
ANSWER: <the answer, at most 5 sentences>
SOURCES: <comma-separated absolute paths of the repository files you read, or none>
```

### B4: a notes file the agents maintain

As A4, with the second rule allowing changes to `{REPO}/NOTES.md`, and this paragraph before the question:

```
The repository has a memory file, NOTES.md, kept by agents that worked here before you. Read it before anything else and treat it as your project memory: when it answers the question, answer from it; read other repository files only for what it does not cover. After you answer, update NOTES.md so that a later session can reuse your work: add an entry for this question, or correct the existing one. Keep each entry short: the question, the answer, and the files it came from.
```

### C4: a knowledge tree the agents maintain

As A4, with the second rule allowing changes "through the knowledge tree commands below", and this text before the question:

```
The repository has a knowledge tree in .rosemary/, kept by agents that worked here before you. Each stored answer records the files it was derived from, and the tree marks it stale when one of those files changes. Treat the tree as your project memory. Before anything else, run:
  node {REPO}/.rosemary/grow.js read --budget 400 --dir {REPO}
- If a fresh stored answer covers the question, answer from it.
- If the stored answer is stale, run `why <id>` to see a diff of what changed since it was written. If the change does not affect the answer, run `confirm <id>` and answer from it. Otherwise work out the new answer and store it with `write` under the same id.
- If no stored answer covers the question, answer from the repository files, then store your answer with `write`.
Commands (all take --dir {REPO}):
  node {REPO}/.rosemary/grow.js expand <id>    (one stored answer in full, with its status)
  node {REPO}/.rosemary/grow.js why <id>       (its sources, and a diff of what changed since it was written)
  node {REPO}/.rosemary/grow.js confirm <id>   (record that it still holds)
  node {REPO}/.rosemary/grow.js write q:<short-name> --spec - <<'EOF'
  {"title": "<the question>", "gist": "<the answer in one or two sentences>", "body": "<details>", "sources": ["src/example.js", "glob:src/**/*.js"]}
  EOF
In "sources", list every file the answer depends on, relative to the repository. If the answer depends on which files exist, add a "glob:" source that matches them.
```
