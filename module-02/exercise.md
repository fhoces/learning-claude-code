# Module 2 drill: Markdown as the interface

In `~/claude-code-practice` (built in module 1).

## Q1. Generate, then prune, a CLAUDE.md

In Claude Code:

> /init

Read what it wrote. Then edit it by hand to **facts only, under 40
lines**: how to build the data, how to run the metrics script, the one
convention that matters (the CSV is generated and never committed),
and what "done" means (script runs clean, output has one row per city).
Delete anything that is a procedure or that the code already makes
obvious.

```bash
wc -l CLAUDE.md          # under 40
```

## Q2. Write the spec

Create `SPEC.md` by hand (not through Claude) with this exact content
for the metrics:

```markdown
# Trip metrics spec

One row per city, sorted by trip count descending. Columns:

- trips: number of trips
- mean_fare: mean of fare_usd, 2 decimals
- median_fare: median of fare_usd, 2 decimals
- mean_km: mean of distance_km, 2 decimals
- share_five: share of trips with rating == 5, 3 decimals

Rows with distance_km <= 0, fare_usd <= 0, or rating outside 1..5
are excluded before computing anything, and the number excluded is
printed first.
```

Note the last paragraph: the data has three bad rows by construction
(module 1's generator). The current script does not exclude them. The
spec is now ahead of the code, which is the normal state.

## Q3. Derive the README from the spec

> Write README.md for this repo. The metrics section must be derived
> from SPEC.md, not from the script. Where the script and the spec
> disagree, say so in a "Known gaps" section rather than papering over
> it.

Expected: a README whose metrics list matches the spec, and a "Known
gaps" section that names the missing exclusion rule. If the README
describes the script's current behavior as if it were the spec, that
is the drift this module is about; send it back.

## Q4. Audit the instruction file

> /doctor prompt-audit CLAUDE.md

Expected: a short report. Add a deliberately contradictory line to
`CLAUDE.md` ("Always commit after every edit" when you already wrote
"never commit unless asked"), rerun, and confirm the audit flags it.
Remove the line.

## Q5. A stale number that grep must catch

Put a sentence in the README that wraps a number across lines, for
example:

```
The dataset holds 5000
trips across four cities.
```

Then change the generator's `n` to 6000, rebuild, and ask:

> The README says how many trips the dataset holds. Check it against
> data/trips.csv and fix it if stale.

Watch whether Claude's first search finds the wrapped number. If it
greps for `5000 trips` it will miss. The fix is to sweep with the bare
number or to read the section. Confirm the README ends up saying 6000
and that the number sits on one line afterward.

## Q6. Write a brief

Write (by hand) a five-line brief for a subagent that will add the
exclusion rule from the spec to `data/trip_metrics.R`. It must: name
the file, point at `SPEC.md`, say what "done" means, say to commit and
not push, and say to return a summary as text. Keep it for module 4,
where you will send it.
