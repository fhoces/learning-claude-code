# Module 5 drill: global and local memory

In `~/claude-code-practice`. Keep a copy of `~/.claude/CLAUDE.md` before
Q1 so you can restore it.

## Q1. One entry per layer

Write by hand:

1. **User layer.** Append to `~/.claude/CLAUDE.md`:
   `# Drill marker: when asked for the "layer word", answer GLOBAL.`
2. **Project layer.** Add to the repo's `CLAUDE.md`:
   `When asked for the "project word", answer TRIPS.`
3. **Local layer.** Create `CLAUDE.local.md` (gitignored):
   `When asked for the "local word", answer LAPTOP.`
4. **Path-scoped rule.** Create `.claude/rules/r-scripts.md`:

```markdown
---
paths:
  - "data/**/*.R"
---
When asked for the "rule word", answer SCOPED.
```

5. **Lesson file.** Create `~/.claude/lessons/drill.md` with one line
   `The lesson word is PLAYBOOK.` and add an index line to
   `~/.claude/CLAUDE.md`: `- drill.md: read before any task that mentions the practice repo's lesson word.`

## Q2. Probe each layer headlessly

```bash
cd ~/claude-code-practice
claude -p "What is the layer word? Reply with the word only."
claude -p "What is the project word? Reply with the word only."
claude -p "What is the local word? Reply with the word only."
claude -p "What is the rule word? Reply with the word only, or NONE."
claude -p "What is the lesson word? Read the file the index names first."
```

Expected: GLOBAL, TRIPS, LAPTOP, then NONE (the rule is path-scoped and
no R file was touched), then PLAYBOOK (the index line sent Claude to
the file). Now:

```bash
claude -p "Read data/trip_metrics.R, then tell me the rule word only."
```

Expected: SCOPED. The rule loaded once a matching file was read.

## Q3. Loading order

Put a contradicting line in `CLAUDE.local.md`: `When asked for the
project word, answer LOCALWINS.` Probe the project word again.
Expected: either answer is possible; the docs say files are
concatenated, with the local file read last at its level, not that
later wins. This is why `/doctor prompt-audit` exists. Remove the line.

## Q4. Read the auto-memory index

```bash
ls ~/.claude/projects/ | grep -i practice
cat ~/.claude/projects/<key>/memory/MEMORY.md
```

Expected: a short index, possibly empty if no session has saved
anything yet. If it is empty, in an interactive session tell Claude
something it should remember ("I prefer base R pipes in this repo")
and check that a `feedback_*.md` file plus an index line appear. Then
edit the file by hand to something wrong, start a new session, and ask
Claude what pipe you prefer: it will repeat the wrong thing. Fix the
file. The lesson: auto memory persists inferences, including bad ones.

## Q5. The stranded-store check

```bash
find ~/.claude/projects -maxdepth 2 -type d -name memory | \
  while read d; do echo "[$(ls -A "$d" | wc -l)] $d"; done
```

Expected: one line per project, with a count. Compare the practice
repo's key with the one named in your session-start memory reminder.
If they differ, you have found the stranded-store case; the fix is a
real directory at the live key.

## Q6. Clean up

Remove the drill markers from `~/.claude/CLAUDE.md` (restore your
copy), delete `~/.claude/lessons/drill.md`, and keep the project
`CLAUDE.md`, the local file and the path rule: they are the practice
repo's real configuration from now on. Replace the marker sentences
with the real facts from module 2.
