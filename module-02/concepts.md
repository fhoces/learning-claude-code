# Module 2: Markdown as the interface

## What this module covers

Markdown is the interface to Claude Code in both directions. What you
write for Claude (`CLAUDE.md`, rules files, a spec, a brief for an
agent) is Markdown. What Claude writes for you (a README, a plan, a
handoff note, a findings report) is Markdown. This module is about
writing both kinds well: what belongs in an instruction file and what
does not, how long it can be before adherence drops, how to keep one
document the authoritative spec so the others cannot drift from it,
and how to make the facts in a document survive the tools that will
later search it.

Reference: [How Claude remembers your project](https://code.claude.com/docs/en/memory)
(the `CLAUDE.md` sections) and
[Best practices](https://code.claude.com/docs/en/best-practices).
Module 5 covers where the instruction files live and how they load;
this module is about what goes in them.

## Documentation Claude reads: instructions

`CLAUDE.md` is loaded into every session. The docs' guidance, which
matches experience:

- **Facts, not procedures.** Build commands, conventions, project
  layout, "always do X" rules. A multi-step procedure that only matters
  for one kind of task belongs in a skill (module 6) or a path-scoped
  rule (module 5), where it loads only when needed.
- **Under 200 lines per file.** Longer files cost context on every
  request and reduce adherence. Imports (`@path/to/file`) organize a
  long file but do not reduce its cost: imported files load at launch
  too.
- **Specific and consistent.** Two contradicting instructions let the
  model pick one arbitrarily. `/doctor prompt-audit` finds
  contradictions and stale entries across `CLAUDE.md`, rules, skills
  and subagents.
- **Context, not enforcement.** Everything in `CLAUDE.md` is advice the
  model weighs. To make something impossible, use a hook (module 7).

`/init` generates a starting `CLAUDE.md` from the codebase: build
commands, test instructions, conventions it can discover. The
instructions worth adding by hand are the ones it cannot discover:
why a convention exists, what not to do, what "done" means here.

### The lessons-library pattern

A global `CLAUDE.md` that accumulates every lesson from every session
grows past the budget within months. The pattern that keeps it under
control: the always-loaded file holds the rules that apply to every
task, plus a short index of area-specific playbooks ("`latex.md`: any
LaTeX build, bibtex, page-fitting"), each in its own file that is read
only before a task in that area. Lessons learned in an area go to that
area's file, not to the index. Module 5 shows the mechanics; the point
here is the writing: an index line must say *when* to read the file,
not just what it contains.

### A burned example: the number that contradicts its definition

An instruction can say "for the 112 cases where control is an empty
arm" when the empty-arm cases are actually the other 205. The number
and the definition pick out different sets. The definition is usually
the load-bearing intent and the number the slip. When you write a
spec, give the definition and let the number be computed; when you
read one and the two disagree, surface it rather than silently picking
the number.

## Documentation Claude reads: the spec

Every course in this collection has a `learning-plan.md` that is the
authoritative statement of what is in and out of scope. The `README`,
the hub page and each module's `concepts.md` are derived from it and
are expected to agree with it. The `new-module` skill checks the plan
before scaffolding and stops if the requested module is not there.

The practice matters more than the file name: one document is the
spec, everything else is derived, and a disagreement is a bug in the
derived document until proven otherwise. The drill builds that
relationship for the practice repo.

## Documentation Claude reads: briefs

A brief for a subagent, a peer session, or a cloud session is the only
context the recipient has. What works:

- State the goal and what has already been ruled out.
- Point at files and docs to read instead of retyping them.
- Scope every rule to its target. "Don't name any school" led a peer
  session to strip every institution from a web page, including true
  affiliations. Write "don't name X, Y, Z (the target); other
  affiliations stay as in the source."
- Make it self-contained. A peer session restarts with a new name and
  none of the earlier context.
- Say what to do with the result: commit per chunk, return findings as
  text (subagents are refused when they try to write report files),
  stop by a time.

## Documentation Claude writes

Three kinds come up constantly:

**README and concepts.** Conversational, derived from the spec, with
the numbers it quotes computed from the source rather than typed. A
README that says "24 CSVs" after the pipeline produces 29 is the
commonest stale fact.

**Plans and handoff notes.** A `NEXT SESSION` block at the end of a
session, written to disk, with state, rules, build and verify steps,
and the file boundary for the next session. Conditional threads
("when a cloud session asks") get one line or are dropped; once the
user dismisses a thread, it stays out of every later recap.

**Findings reports.** A verifier agent's output. Save each one to disk
as it arrives; what is only in the chat is lost at `/clear`.

### Facts that survive grep

A line-based `grep` for `24 CSVs` misses "the 24\nhandoff CSVs" wrapped
across lines. Sweep with the bare number plus a context pass, or read
the whole section. The same trap in LaTeX: a phone number written with
a tie (`555~0123`) slips past a space-or-hyphen pattern. When a document
will be audited by search, keep each fact on one line and in one
spelling.

### House style for anything user-facing

This collection's instruction files carry a style rule that applies to
prose Claude writes: no em-dashes, short sentences, few colons and
semicolons, no opening affirmations, no filler enthusiasm. Two reasons
it lives in `CLAUDE.md` rather than being re-explained per session: it
is a fact about every task, and it is checkable (`grep -c` for the
character) before a commit.

## The drill

`exercise.md` writes a `CLAUDE.md` for the practice repo (facts only,
under 40 lines), a one-page `SPEC.md` that defines the metrics the
script must compute, has Claude generate the `README.md` from the spec,
then audits: `/doctor prompt-audit` for the instruction file, and a
deliberate stale number in the README that a grep sweep must catch.
