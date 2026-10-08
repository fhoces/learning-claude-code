# Module 5: Global and local memory

## What this module covers

Every session starts with an empty context window. What carries over
is a set of files Claude Code loads at launch: instruction files you
write at the user and project level, rules scoped to paths, and the
notes Claude writes for itself. This module is about the layers, the
order they load in, their size limits, what belongs in each, and the
hygiene that keeps them useful over months: the lessons-library
pattern, an end-of-session refresh ritual, and the two ways memory
goes missing (a project-key change, a cloud session).

Module 2 was about writing these files well. This module is about
where they live and how they load.

Reference: [How Claude remembers your project](https://code.claude.com/docs/en/memory).

## The layers

| Layer | Path | Who writes | Loaded |
|---|---|---|---|
| Managed policy | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) | an organization | every session |
| User (global) | `~/.claude/CLAUDE.md`, `~/.claude/rules/*.md` | you | every session, every project |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | you, shared via git | every session in the repo |
| Project local | `./CLAUDE.local.md` | you, gitignored | alongside the project file |
| Project rules | `./.claude/rules/*.md` | you, shared via git | every session, or on demand if path-scoped |
| Subdirectory | `<subdir>/CLAUDE.md` | you | when Claude touches a file in that subdirectory |
| Auto memory | `~/.claude/projects/<key>/memory/MEMORY.md` + topic files | Claude | index every session; topic files on demand |

Loading order for the instruction files: every `CLAUDE.md` and
`CLAUDE.local.md` from the filesystem root down to the working
directory, concatenated, so the file closest to where you launched is
read last. Within a directory, `CLAUDE.local.md` is appended after
`CLAUDE.md`. Subdirectory files load once Claude reads, writes or
edits a file in that subdirectory (a `cat` of a single file counts as
a read). Nothing overrides anything; it is all concatenated, which is
why contradictions matter.

`@path/to/file` inside a `CLAUDE.md` imports that file at launch. An
import that points outside the project asks for approval once; user-
scope files load their imports without the dialog. Imports organize;
they do not reduce the context cost.

### Rules with paths

A file in `.claude/rules/` with `paths:` frontmatter loads only when
Claude works with a matching file:

```markdown
---
paths:
  - "data/**/*.R"
---
# R scripts in data/
Use base pipes (|>), never magrittr. Print excluded-row counts before summaries.
```

Without `paths:`, a rule loads every session like `CLAUDE.md`. Rules
in `~/.claude/rules/` apply to every project. The directory supports
symlinks, so one shared rule set can be linked into several projects
(an approval dialog once per project).

### Auto memory

Claude writes four kinds of note, each one file with frontmatter
(`type: user | feedback | project | reference`), and keeps a one-line
pointer per file in `MEMORY.md`. The first 200 lines or 25 KB of
`MEMORY.md` load every session; topic files are read on demand. When
the index nears the limit, the harness tells Claude to shorten it. The
memory directory is keyed by the git repository, so worktrees and
subdirectories share it; it is machine-local and never reaches a cloud
session. Subagents do not get the main conversation's auto memory
(a fork does). `/memory` toggles it; `autoMemoryDirectory` in settings
moves it.

## What belongs where

The test for each layer is who else should see it and when it is
needed:

- **Applies to every task in every project, and is a fact or a rule
  about how you work**: user `CLAUDE.md`. Style rules, "ask before
  sending email", "state the model when launching an agent."
- **Applies to this project and your collaborators should have it**:
  project `CLAUDE.md`. Build commands, layout, conventions, what
  "done" means.
- **Applies to this project but is yours alone**: `CLAUDE.local.md`.
  Sandbox URLs, a local data path.
- **Applies only when touching certain files**: a path-scoped rule.
- **A multi-step procedure for one kind of task**: a skill (module 6),
  not memory at all.
- **Something you corrected Claude on, or a preference it inferred**:
  auto memory, written by Claude. Check it occasionally; a wrong
  inference persists until edited.

The auto-memory rules this collection uses, stated in the harness's
own instructions: one fact per file; don't save what the repo already
records (code structure, past fixes, git history, `CLAUDE.md`); link
related memories; update rather than duplicate; delete what turns out
wrong; if a memory names a file or flag, verify it still exists before
recommending it.

## The lessons-library pattern

A global `CLAUDE.md` that collects every lesson grows past 200 lines
in months. The pattern:

1. The always-loaded file keeps the rules that apply to every task
   and a short index: one line per area, saying when to read it.
2. Each area's playbook is its own file under `~/.claude/lessons/`,
   read in full before a task in that area ("any LaTeX build", "any
   xaringan deck").
3. New lessons go to the area file, not the index. Older one-off
   entries move to an archive file.

This is the memory-side counterpart of the cost lever in module 4:
pay for the index every request, pay for the playbook only when the
task needs it. It also keeps the index readable, which is what makes
Claude actually consult it.

## The end-of-session ritual

A session that learned something should write it down before `/clear`,
and the writing should be de-personalized enough to be useful next
time. The pattern codified as a skill in this collection: a trigger
token at the end of a session refreshes local project memory and the
global instruction file, suggests skills for any workflow that
repeated, and offers a tailored `NEXT SESSION` handoff note to paste
into the next session. The token is the go-ahead; the skill does not
ask again. Long sessions also get a mid-session prompt: when the
context is getting expensive, say so and offer the refresh before
continuing.

A related habit for confusions: when the user says "I don't understand
X", log it (date, concept, what the confusion was) and, before
explaining anything in the same family later, pre-emptively add detail
and a concrete example. The log is maintenance for how to explain, not
a verdict on anyone.

## Where memory goes missing

**The project key changed.** The memory directory's `<key>` is
derived from the path; a harness update changed the derivation once
(an underscore became a hyphen), leaving the old store invisible while
an empty one auto-created at the new key. Check: does the key named in
the session-start reminder match where the files are? Fix with a real
directory at the live key, not a symlink (recall does not traverse
symlinks). Verify end to end with a headless probe:
`claude -p "state one fact from your memory index, or NO INDEX"` from
the project directory.

**Cloud sessions.** A session on claude.ai sees the repo clone and the
account, not this machine's `~/.claude`: no user `CLAUDE.md`, no
skills directory, no auto memory, no hooks. What works: commit project
rules and skills into the repo (`.claude/rules/`, `.claude/skills/`),
and have cloud sessions write their memory to a committed
`.claude/memory/` that a local session drains into the real stores.

## The drill

`exercise.md` writes one entry per layer for the practice repo (a user
rule, a project fact, a local-only note, a path-scoped rule, and a
lesson file with an index line), then proves each loads with a
headless `claude -p` probe. It ends by reading the auto-memory index
and editing one wrong inference.
