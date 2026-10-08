# Learning Claude Code

An 8-module course on working with Claude Code as a daily tool for
applied research and data work. Not a prompting guide: the practices
(version control, documentation, verification, token budgeting) and
the extension mechanisms (memory, skills, hooks, mods) that turn an
agentic coding session into something safe, cheap, and reproducible.
Every module is concept → show → drill.

## Why this exists

Most Claude Code material is a feature tour. This course is organized
the way the lessons were actually learned: by what went wrong. A commit
amended on the wrong SHA, a verification that passed on a stale file, a
session that spent its budget re-reading the same log, a rule written
in memory that Claude treated as a suggestion. Each module takes one of
those failure classes and shows the practice or mechanism that closes
it, with the official docs linked for the details that change between
releases.

The audience is someone who already uses Claude Code, git, R and Python
daily and wants a reference they could hand to a colleague.

## How to use this repo

```bash
# 1. Build the practice dataset (once)
Rscript data/build_data.R

# 2. Read the concepts file for each module
open module-01/concepts.md

# 3. Walk through the slide deck
open module-01/slides.html

# 4. Run the drill in a live Claude Code session
cat module-01/exercise.md
```

Module 1's drill creates a throwaway practice repo
(`~/claude-code-practice`) from `data/`; every later drill edits it.

## A note on the drills

The sibling courses ship runnable `exercise.R` / `.py` / `.sql` files.
Here the thing being drilled is a terminal session, so each module's
drill is `exercise.md`: numbered prompts to type, commands to run, and
the output to look for. That is the one deliberate deviation from the
collection's conventions.

## Modules

| # | Module | ~Time | What you drill |
|---|--------|-------|----------------|
| **1** | [Version control as the safety net](module-01/) | 1h | Make, inspect and commit a change through Claude; break history on purpose and recover it |
| 2 | Markdown as the interface | 1h | Write a `CLAUDE.md` and a spec; generate a README from the spec; audit both for contradictions |
| 3 | Verification plans | 1h | Write a plan before a change, inject a bug, show which check catches it |
| 4 | Token management | 1h | Measure context before and after a big read; redo it through a subagent; compare |
| 5 | Global and local memory | 1h | One entry per memory layer, each proven to load with a headless probe |
| 6 | Skills | 1h | A `trip-report` skill with a bundled script, invoked by name, by description, and with arguments |
| 7 | Hooks | 1h | Block edits to raw data, gate `git push`, lint after every edit; trigger each and read the transcript |
| 8 | Mods | 1h | A `trip-guard` mod: deny, status line, toast; validate, test, load |

## Stack

Claude Code (`claude --version` 2.1.x at time of writing), git, R for the
practice scripts (tidyverse), `jq` for hook scripts, Node/TypeScript
only in module 8 (type-checking a mod). Slides are xaringan.

```r
install.packages(c("tidyverse", "rmarkdown", "xaringan"))
```

```bash
brew install jq        # module 7
```

## Key references

- [Claude Code docs](https://code.claude.com/docs/en/overview): the
  source for every behavior claim; each module links its page.
- [How Claude remembers your project](https://code.claude.com/docs/en/memory):
  modules 2 and 5.
- [Hooks reference](https://code.claude.com/docs/en/hooks) and
  [Skills](https://code.claude.com/docs/en/skills): modules 6 and 7.
- [Manage costs effectively](https://code.claude.com/docs/en/costs):
  module 4.

## Companion courses

Part of a small set of refreshers for applied policy-economics work:

- [sql-industry-prep](https://github.com/fhoces/sql-industry-prep): SQL querying
- [python-for-r-users](https://github.com/fhoces/python-for-r-users): pandas + statsmodels from R
- [experimentation-refresher](https://github.com/fhoces/experimentation-refresher): A/B testing and experimental design
- [causal-inference-beyond-ab](https://github.com/fhoces/causal-inference-beyond-ab): observational causal inference
- [admin-data-pipelines](https://github.com/fhoces/admin-data-pipelines): the pipeline side of policy research
