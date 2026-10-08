# Module 6 drill: skills

In `~/claude-code-practice`.

## Q1. Write the skill and its script

```bash
mkdir -p ~/.claude/skills/trip-report/scripts
cat > ~/.claude/skills/trip-report/scripts/report.R <<'R'
suppressPackageStartupMessages(library(dplyr))
args  <- commandArgs(trailingOnly = TRUE)
trips <- read.csv("data/trips.csv", stringsAsFactors = FALSE) |>
  filter(distance_km > 0, fare_usd > 0, rating %in% 1:5)
if (length(args) >= 1) trips <- filter(trips, city == args[1])
trips |> group_by(city) |>
  summarise(trips = n(), mean_fare = round(mean(fare_usd), 2),
            p90_fare = round(quantile(fare_usd, .9), 2), .groups = "drop") |>
  as.data.frame() |> print()
R
cat > ~/.claude/skills/trip-report/SKILL.md <<'MD'
---
name: trip-report
description: Produce the per-city trip report (trips, mean fare, p90 fare) from data/trips.csv in the practice repo. Use when the user says "trip report", "city report", "how do fares compare across cities", or names one city and asks for its numbers.
argument-hint: [city]
allowed-tools: Bash(Rscript ${CLAUDE_SKILL_DIR}/scripts/report.R *)
---

Run `Rscript ${CLAUDE_SKILL_DIR}/scripts/report.R $ARGUMENTS` from the repo
root and show the output as a table. If no city was given, all cities are
reported. Do not edit the script; if it fails, show the error and stop.
MD
```

## Q2. Invoke by name, then by phrase

In an interactive session (new or existing; the skill registers live):

> /trip-report

Expected: a four-row table, without a permission prompt for the
`Rscript` call (the `allowed-tools` line). Then, without naming it:

> How do fares compare across cities?

Expected: the same skill fires from the description. If Claude answers
by reading the CSV instead, the description did not trigger; add the
phrase you used to the description and try again.

## Q3. Arguments

> /trip-report Denver

Expected: one row. Check the transcript: `$ARGUMENTS` became `Denver`
in the command. Now try `/trip-report "Denver"` and a city that does
not exist; the script should print an empty table rather than error.

## Q4. Invocation control

Add `disable-model-invocation: true` to the frontmatter. Repeat the
phrase from Q2. Expected: Claude no longer loads the skill on its own;
`/trip-report` still works. Swap it for `user-invocable: false`:
expected the reverse (gone from the `/` menu, still loads from the
phrase). Remove both.

## Q5. Fork it

Add `context: fork` and `agent: general-purpose`. Invoke by name.
Expected: the skill runs in a subagent; its output returns as a
summary and the `Rscript` output does not land in your main context
(`/context` before and after). Remove the fork lines; this skill is
small enough not to need it.

## Q6. Project scope

```bash
mkdir -p .claude/skills && mv ~/.claude/skills/trip-report .claude/skills/
git add .claude/skills && git commit -qm "Add trip-report skill"
```

Start a new session in the repo and run `/trip-report`. Expected: it
resolves from the project location. Start a session in another
directory: expected it does not exist there. This is the scope a cloud
session would see.

## Q7. Read a real one

```bash
cat ~/.claude/skills/verify-slides/SKILL.md
```

Note the three things it does that `trip-report` does not: inputs to
confirm in one batch, a single chained bash call so the user sees one
operation, and a read-back checklist of what to look for. Those are
the parts that make a skill a procedure rather than a command alias.
