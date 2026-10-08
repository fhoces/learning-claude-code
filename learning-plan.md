# Learning Claude Code

An 8-module course on working with Claude Code as a daily tool for
applied research and data work: not "how to prompt", but the practices
and extension mechanisms that make an agentic coding session safe,
cheap, and reproducible. The learner already uses Claude Code, R,
Python and git every day. This course organizes what they have learned
the hard way into a reference they can hand to a colleague.

**Time budget: ~8 hours**

| # | Module | ~Time | Core content | Drill flavor |
|---|--------|-------|--------------|--------------|
| 1 | Version control as the safety net | 1h | Why an agent needs cheap undo; commit granularity and attribution trailers; reading the diff, not the summary; branches and worktrees for agents; what Claude cannot do in git (interactive rebase) and what it does wrong (`--amend` on the wrong commit, `git add -A` in a half-authored folder); push gating; detecting a concurrent session on the same repo; checkpoints (`/rewind`) vs git. | Build a practice repo, have Claude make and commit a change, inspect it with `git show`, break history on purpose and recover with reset plus cherry-pick |
| 2 | Markdown as the interface | 1h | Markdown runs both directions: what you write for Claude (`CLAUDE.md`, rules, briefs, specs) and what Claude writes for you (README, plans, handoff notes). Facts vs procedures; the 200-line budget; `/init` and the prompt audit; a spec file as the single source of truth; briefs for agents and peer sessions; writing docs that survive `grep`. | Write a `CLAUDE.md` and a spec for the practice repo, generate the README from the spec, then audit both for contradictions and stale numbers |
| 3 | Verification plans | 1h | Say how the work will be verified before doing it. Existence vs correctness vs intent checks; render-then-read, golden outputs, independent re-derivation, render-time assertions; the failure modes that make a check lie (stale artifacts, grep false negatives, wrapper "completed", `&&` vs `;` chains); writing a plan as a table with a predicted failure signature. | Write a plan for a change to the metrics script, inject a bug, show which check catches it and which plan would have missed it |
| 4 | Token management | 1h | Every request resends the conversation; what the cache does and does not save; what fills context (tool output, file reads, tool definitions, instruction files); `/context`, `/usage`, the status line; the levers (`/clear`, `/compact` with instructions, subagents for verbose work, hooks that prefilter, skills instead of long `CLAUDE.md`, specific prompts, plan mode, effort and model); when parallel agents are worth their multiplied spend. | Measure context before and after a big file read, redo it through a subagent, compare; write a compaction instruction and a parallelization opinion |
| 5 | Global and local memory | 1h | The three layers: user `~/.claude/CLAUDE.md`, project `CLAUDE.md` + `CLAUDE.local.md` + `.claude/rules/`, and auto memory (`MEMORY.md` index plus topic files). Loading order and limits; `@imports`; path-scoped rules; what belongs in which layer; the lessons-library pattern (playbooks out of the always-loaded file, read on demand); the end-of-session refresh ritual; memory that goes missing (project-key changes, cloud sessions). | Write one entry per layer for the practice repo, then prove each loads with a headless `claude -p` probe |
| 6 | Skills | 1h | `SKILL.md` anatomy and locations; frontmatter that controls invocation (`description`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `context: fork`); `$ARGUMENTS` and `${CLAUDE_SKILL_DIR}`; supporting files and bundled scripts; skill vs memory vs hook; writing a description that triggers; a skill registers live, so smoke-test it in the same session; project skills for cloud sessions; plugins and marketplaces. | Write a `trip-report` skill with a bundled R script, invoke it by name and by description, pass an argument, and restrict its tools |
| 7 | Hooks | 1h | Memory is context, hooks are enforcement. Event list (the ones that matter daily), `settings.json` structure, matchers and `if` rules, exit codes 0/2, stdin JSON, JSON decisions (`permissionDecision`, `updatedInput`, `additionalContext`), `async` and `timeout`. Patterns: protect a file, prefilter noisy output, format after edit, gate a push, inject context at session start. Debugging with `/hooks` and `--debug`. | Write a `PreToolUse` hook that blocks edits to the raw data and one that gates `git push` on a flag file; a `PostToolUse` hook that lints after every R edit; trigger each and read the transcript line |
| 8 | Mods | 1h | A mod is a plugin of function hooks in TypeScript: three files, `on(event, matcher, hook)`, every hook `($, e, next)`. The catalogue: pane, band above the prompt, status line, toast, blocking or rewriting a tool call, prompt rewriting, slash commands, state that survives reloads. The authoring loop: `plugin-authoring` skill, hot reload, `claude plugin validate`, `claude plugin test`, `--plugin-dir`, sharing through a marketplace file. Early-access API: the generated types file is the authority. | Build a `trip-guard` mod: deny edits to `trips.csv`, show the last failed command in the status line, toast when a turn runs long; validate, test, load |

Optional stretch modules (build only if asked): **Subagents and
workflows** (briefing, fan-out over a shared spec, verifier agents,
workflow scripts); **Headless and scheduled use** (`claude -p`, cron
routines, cloud sessions); **MCP servers** (when a CLI beats a server).

## Module dependencies

- Module 1 creates the practice repo (`~/claude-code-practice`) that
  every later drill edits. Do it first.
- Modules 2 and 5 both write `CLAUDE.md`-family files; 2 is about the
  writing, 5 about the layering and loading. Read 2 before 5.
- Module 3's verification plan is reused as the test oracle in modules
  7 (hook that lints) and 8 (mod that guards).
- Modules 5 → 6 → 7 → 8 are the extension ladder, in increasing order of
  enforcement: instructions Claude reads, procedures Claude loads on
  demand, commands the harness runs regardless, and code that changes
  the harness itself. Each module says what the previous layer could
  not do.

## Design choices (decided once, applied everywhere)

1. **Domain.** Ride-sharing, as in the sibling courses. The practice
   repo holds `data/trips.csv` (synthetic trips: driver, rider, city,
   pickup time, distance, fare, rating) built by `data/build_data.R`,
   and `data/trip_metrics.R`, a small script every drill asks Claude to
   change. No real data, no real company.
2. **Drill format.** The drills are `exercise.md`, not `.R`/`.py`/`.sql`:
   the thing being drilled is a terminal session with Claude Code, so
   each drill is a numbered list of prompts to type, commands to run,
   and the output to look for. This deviates from the sibling courses'
   runnable drill files and is the one deliberate exception. Section
   headers keep the `## Q1. Title` shape.
3. **Facts come from the docs or from a burn.** Every claim about how
   Claude Code behaves is either in the official docs
   (code.claude.com/docs) or is a lesson from a real session, marked as
   such ("observed 2026-xx-xx"). Behavior changes between releases;
   when a slide and the tool disagree, trust `claude --version` and the
   docs.
4. **Nothing personal in the repo.** Examples use the ride-share repo,
   never the author's private projects, paths, or correspondents.
5. **One published reference per module where applicable.** The
   relevant docs page is linked from every `concepts.md`.

## How to use this repo

1. Build the practice dataset once: `Rscript data/build_data.R`
2. Read each module's `concepts.md`
3. Walk through `slides.Rmd` (or the rendered `slides.html`)
4. Run each module's `exercise.md` top to bottom in a live Claude Code
   session, then re-do the core drill from a cold start

Say **"start module 1"** to begin.
