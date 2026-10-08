# Module 1: Version control as the safety net

## What this module covers

An agent that edits files quickly needs an undo that is just as quick,
and an audit trail that does not depend on anyone's memory of what was
asked. Git is both. This module is about the git habits that matter
specifically when Claude Code is doing the typing: how to make commits
that can be reasoned about later, how to read what the agent did
instead of what it said it did, where the agent's git abilities stop,
and the two or three git mistakes an agent makes that a human rarely
does. The running example is the practice repo you build in the drill:
a ride-share trip table and one metrics script.

Reference: [Claude Code docs, "Common workflows"](https://code.claude.com/docs/en/common-workflows)
and the git section of the docs' best practices. Behavior described as
"observed" is from real sessions, dated, and may change between
releases.

## Why git, specifically, with an agent

Three things change when the editor is an agent:

1. **Volume.** A single turn can touch twenty files. A diff is the only
   artifact that scales; the summary in the chat does not.
2. **Confidence.** The agent reports completion in the same tone whether
   the change is right or wrong. The diff has no tone.
3. **Overlap.** Two sessions, a subagent, or a scheduled task can be in
   the same working tree at once. Git is the only shared state they all
   respect.

Claude Code also keeps its own checkpoints: `/rewind` (or double
Escape) restores both the conversation and the files to an earlier
point in the session. That is the right tool for "undo the last ten
minutes." It is not a substitute for git: checkpoints are per session,
invisible to collaborators, and gone when the session is.

## Commit granularity and who commits

The default rule in this collection's `CLAUDE.md` files: Claude commits
only when asked, and never pushes without an explicit request in the
current session. The reasons:

- A commit is a statement that the change is done and reviewed. The
  agent cannot review its own work from the outside.
- An unrequested push to a public default branch publishes everything
  in the commit, including files the agent swept in by accident (see
  the `git add -A` section).

What to ask for: one commit per task, with a message that says what
changed and why, ending in the attribution trailer the harness supplies
(`Co-Authored-By: Claude ... <noreply@anthropic.com>`). The trailer is
how a later reader, or a later session, knows which commits were
agent-written and can look at them with the extra care they deserve.

Subagents should commit but never push. A fan-out of agents that each
push is a race.

## Reading what the agent did

Three commands, always, before trusting a report of completion:

```bash
git status --short          # what is modified, what is untracked
git diff --stat             # which files, how much
git diff -- path/to/file    # the actual change
```

After a commit, `git show --stat HEAD` and `git log --oneline -5`. The
habit to build: read the diff, not the summary. A diff that is larger
than the request, or that touches a file the request did not mention,
is the first sign of scope creep.

Two patterns worth naming:

- **The rendered-output diff.** A re-render of a Quarto or R Markdown
  document can leave a "modified" file whose entire diff is
  `data-execution_count` noise or a PDF timestamp. Confirm with
  `git diff FILE | grep -v execution_count` returning nothing, then
  discard with `git checkout -- FILE`. Do not chase it as a regression.
- **The commit you do not remember.** A commit with a different
  session URL or co-author model in its trailer belongs to another
  session (see concurrent sessions below). `git show --stat` it before
  building on it.

## Branches and worktrees for agents

A subagent given `isolation: "worktree"` (or a session started with
`claude --worktree`) works in its own checkout under
`.claude/worktrees/`, on its own branch. The main tree stays clean, and
the agent's work arrives as a branch to merge. Three things observed in
practice (2026-09):

- Worktrees are created from `origin/main`, not local `main`. An
  unpushed merge is missing from the agent's tree. Brief the agent to
  `git merge --ff-only main` first, and to check for a named commit.
- While a worktree agent runs, the main session's working directory
  can switch to the worktree. A second agent spawned then works in the
  worktree too. Use `git -C <absolute main path>` and absolute write
  paths in every brief.
- An agent that stops without changes has its worktree and branch
  deleted. Anything gitignored that must survive (extracted data)
  needs to be moved out before `git worktree remove`.

## What the agent cannot do, and what it does wrong

**Cannot:** anything interactive. `git rebase -i`, `git add -i`,
`git add -p` are unavailable in the harness. There is no one-line way
to reword a commit that is not `HEAD`.

**Does wrong, observed:**

- **`git commit --amend` on the wrong commit.** Asked to fix the
  message of a commit three back, `--amend` silently rewrites `HEAD`'s
  message instead; the tree is untouched, so `git log --stat` still
  looks plausible. Recovery, pre-push only: tag the tip as a safety
  net, `git reset --hard <commit-before-the-bad-one>`, replay each
  later commit with `git cherry-pick --no-commit <sha>` plus
  `git commit -F -` for the one being reworded, plain `git cherry-pick`
  for the rest, then `git diff <safety-tag>..HEAD` must be empty before
  the tag is dropped.
- **`git add -A` in a half-authored folder.** Everything in the
  directory goes in, including PDFs and data the agent did not write.
  With `gh repo create --public --push` this publishes them. Habit:
  `git status --short` before the first commit of any directory, add
  intentionally, gitignore the rest. Mitigation if it happens:
  `gh repo edit --visibility private --accept-visibility-change-consequences`
  is instant and non-destructive; deciding whether to purge history is
  a separate conversation.
- **Chained commands that half-run.** `python3 patch.py` on one line
  and `git add && git commit` on the next: a newline is `;`, not `&&`,
  so a failed patch still commits. Keep the mutation and the commit in
  separate calls, or make the whole chain `&&`.

## Push gating

In auto mode, the permission classifier denies `git push` to a public
repo's default branch when the user did not ask for a push in the
current session, even after full QA and even when the session authored
the commits (observed 2026-07). The denial is clean. It also blocks
history rewrites (`git filter-repo` plus a force push) even right after
a yes. Design around it: the push is its own approval step; subagents
commit and never push; `git fetch` before pushing, because a parallel
session may have moved `origin`.

## Concurrent sessions on one repo

More than one session can be in a repo at once: two terminal tabs, a
cloud session, a scheduled task. Signals:

- Uncommitted changes in a repo that should be clean.
- A commit you do not remember, with a different session URL in the
  trailer.
- A push whose `FROM..TO` range does not start at the SHA you pushed
  last.

Habits: `git log --oneline -5` before non-trivial work; search for
same-purpose content before adding it (the "new" file may already
exist under another name); commit orphan work untouched as its own
commit so the owning session can build on it; `git fetch` before
asserting ahead/behind. If a cloud session pushed while local has
unrelated uncommitted edits, `git pull --rebase --autostash` reapplies
them. If it keeps happening, closing the duplicate session is the fix.

## The drill

`exercise.md` builds the practice repo, has Claude make and commit a
change, inspects it with the three commands, then breaks history on
purpose (the `--amend` trap) and recovers it with the reset-and-replay
recipe. The recovery is verified by an empty `git diff` against the
safety tag.
