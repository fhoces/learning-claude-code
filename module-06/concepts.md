# Module 6: Skills

## What this module covers

A skill is a directory with a `SKILL.md`: YAML frontmatter that tells
Claude when to use it, then Markdown instructions, optionally with
scripts and reference files beside it. Its body loads only when it is
invoked, by you (`/name`) or by Claude when a request matches the
description. That makes a skill the right home for a multi-step
procedure: it costs nothing until needed, it can carry a script, and
it can be shared through the repo. This module covers the anatomy,
the fields that control who may invoke it, arguments, bundled
scripts, the decision between a skill, a memory entry and a hook, how
to write a description that triggers, and the lifecycle from first
draft to a plugin others can install.

Reference: [Skills](https://code.claude.com/docs/en/skills).

## Where skills live

| Location | Path | Scope |
|---|---|---|
| Personal | `~/.claude/skills/<name>/SKILL.md` | every project on this machine |
| Project | `.claude/skills/<name>/SKILL.md` | sessions in this repo (and cloud sessions, since it is committed) |
| Nested | `<subdir>/.claude/skills/<name>/SKILL.md` | sessions started in or below `<subdir>` |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | where the plugin is enabled, as `/plugin:name` |
| Enterprise | managed settings directory | every user in the organization |

Same name in several places: enterprise beats personal beats project.
Plugin skills are namespaced and never collide. A file in
`.claude/commands/` (the older custom slash command) is the same
mechanism with fewer features; new work goes in skills.

## Anatomy

```yaml
---
name: trip-report
description: Produce the per-city trip report from data/trips.csv. Use when the user says "trip report", "city summary", or asks how fares compare across cities.
argument-hint: [city]
allowed-tools: Bash(Rscript ${CLAUDE_SKILL_DIR}/scripts/report.R *)
---

Run `${CLAUDE_SKILL_DIR}/scripts/report.R $ARGUMENTS` and show the output.
If no city was given, report all cities. Do not edit the script.
```

The fields that matter day to day:

- `description`: what it does **and when to use it**, key use case
  first. Claude reads this to decide whether to load the skill; it is
  truncated at 1,536 characters in the listing (together with
  `when_to_use`). Write the triggers as things the user actually says.
- `disable-model-invocation: true`: only you can invoke it (a deploy,
  a push, anything with side effects you want to start by hand).
- `user-invocable: false`: hidden from the `/` menu; only Claude loads
  it (background knowledge, a convention Claude should apply without
  being told).
- `allowed-tools`: tools that run without a permission prompt during
  the invoking turn. Does not restrict other tools.
  `disallowed-tools` removes tools while the skill is active.
- `context: fork` with `agent:`: run the skill in a subagent, so its
  tool output stays out of the main window (module 4's lever).
- `paths:`: globs that limit automatic loading to work on matching
  files.
- `model`, `effort`, `hooks`: per-skill overrides.

Substitutions: `$ARGUMENTS` (everything typed after the name),
`$0`/`$1` or named `$city` with an `arguments:` list,
`${CLAUDE_SKILL_DIR}` (the skill's own directory, for bundled scripts;
works in `allowed-tools` too), `${CLAUDE_PROJECT_DIR}`. A
`` !`command` `` line runs before the content is sent and inserts the
output. Arguments typed with no placeholder to receive them are
appended as `ARGUMENTS: ...`.

Supporting files: keep `SKILL.md` an overview under 500 lines; put
detail in `reference.md`, examples in `examples.md`, code in
`scripts/`. Claude opens the files only when the overview points at
them.

## Skill, memory, or hook

| Need | Mechanism | Why |
|---|---|---|
| A fact or rule for every task | `CLAUDE.md` (module 5) | loaded always; cheap if short |
| A multi-step procedure for one kind of task | skill | loads on demand; can carry scripts; shareable |
| Something that must happen regardless of what Claude decides | hook (module 7) | the harness runs it; memory and skills are advice |
| A change to the interface or the harness itself | mod (module 8) | code, not instructions |

The signal that a memory entry should become a skill: it has numbered
steps, it names more than one command, or it has grown past a
paragraph. The signal that a skill should become a hook: it begins
"always" or "never" and the cost of Claude skipping it is high.

## Writing a description that triggers

Claude matches the request against descriptions. What works:

- Lead with the action and the object: "Render a xaringan deck and
  rasterize the pages for inspection."
- Then the triggers as quoted phrases: "Use when the user says
  'verify the slides', 'spot-check slide N', or after any edit to a
  `slides.Rmd`."
- Then the exclusions if a sibling skill is close: "Not for the
  interview-prep `.md`, which uses `make local publish`."

A description that only says what the skill contains ("slide
verification helper") rarely fires. Test both ways: by name, and by a
request phrased like a trigger without naming it.

## Lifecycle

1. **Write it.** Creating `~/.claude/skills/<name>/SKILL.md` registers
   the skill live in the current session (observed 2026-07); it appears
   in the available-skills list after the write, sometimes a turn
   later. So smoke-test in the same conversation, by hand if the
   `Skill` call fails once with "unknown skill".
2. **Smoke-test both invocations.** `/name arg` and a natural request.
3. **Move the scripts in.** Anything the skill runs more than once
   goes in `scripts/`, called through `${CLAUDE_SKILL_DIR}` so it works
   wherever the skill is installed.
4. **Decide the scope.** Personal if it depends on this machine
   (paths, Ghostscript, `pbcopy`); project if a collaborator or a cloud
   session needs it. Most of this collection's skills are personal for
   that reason; the cloud variants are uploaded to the account
   separately and sync down as `anthropic-skills:<name>`, so a skill
   that exists in both places shows up twice.
5. **Share it as a plugin** when others should install it: a
   `.claude-plugin/plugin.json` beside a `skills/` directory, listed in
   a `marketplace.json`; installed with `/plugin install name
   --marketplace owner/repo`. Module 8 shows the plugin layout.

Skills in this collection worth reading as examples: `new-module`
(scaffold with checks and a stop condition), `verify-slides`
(one bash incantation plus a read-back checklist), `msr-lg`
(the end-of-session ritual, trigger token as go-ahead).

## The drill

`exercise.md` writes `trip-report` with a bundled R script, invokes it
by name, by a trigger phrase, and with a city argument, restricts its
tools, forks it, then moves it from personal to project scope and
checks it still resolves.
