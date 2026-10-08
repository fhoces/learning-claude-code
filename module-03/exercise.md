# Module 3 drill: verification plans

In `~/claude-code-practice`. The spec from module 2 (`SPEC.md`) says
rows with `distance_km <= 0`, `fare_usd <= 0`, or a rating outside 1..5
are excluded before any metric is computed, and the excluded count is
printed first. The generator planted exactly three such rows.

## Q1. Baseline, before any change

```bash
Rscript data/trip_metrics.R > /tmp/metrics_before.txt; cat /tmp/metrics_before.txt
```

Expected: four rows, `trips` summing to 5000, no excluded count. Keep
the file; it is the golden "before".

## Q2. Write the plan before the prompt

By hand, write `PLAN.md` with the four-column table from the concepts
file, filled in for this change. Every row needs the last column.
At minimum:

- existence: script exits 0
- correctness: first printed line says 3 rows excluded
- correctness: per-city `trips` sum to 4997
- correctness: `median_fare` present (module 1's change still there)
- intent: `git diff --stat` shows one file; the diff adds one filter
  and one print, nothing else

## Q3. Prompt with the plan attached

> Implement the exclusion rule in SPEC.md in data/trip_metrics.R.
> Before editing, restate how you will verify it. After editing, run
> every row of PLAN.md and report each as pass or fail with the
> evidence. Don't commit.

Expected: Claude's restatement should match your plan or be stricter.
If it says only "I'll run the script," ask for the per-row plan first.
Then check the report against your own run:

```bash
Rscript data/trip_metrics.R | tee /tmp/metrics_after.txt
diff /tmp/metrics_before.txt /tmp/metrics_after.txt
git diff --stat
```

Commit when every row passes.

## Q4. Inject a bug the plan must catch

By hand, move the filter so it runs **after** `summarise` (or just
delete the filter and keep the print of a hardcoded `3`). Rerun the
plan rows yourself:

```bash
Rscript data/trip_metrics.R
```

Expected: the "3 rows excluded" line still prints (the existence-level
and the first correctness row pass), but `trips` sum to 5000. Only the
sum row catches it. That is why the plan has a row that recomputes a
number from the data rather than reading a message the code prints
about itself.

Restore with `git checkout -- data/trip_metrics.R`.

## Q5. A plan that would have passed the bug

Write a second table with only these rows: script exits 0; the output
contains the word "excluded"; the diff touches one file. Run it
against the buggy version. Every row passes. Keep both tables side by
side in `PLAN.md` under "plan that catches it" and "plan that does
not."

## Q6. A check that lies

Reproduce one from the concepts list on this machine and write down
what you saw:

```bash
printf 'a \xe2\x80\x94 b\n' > /tmp/dash.txt     # writes an em-dash
perl -pi -e 's/\x{2014}/-/g' /tmp/dash.txt; echo "exit $?"; cat /tmp/dash.txt
perl -CSD -pi -e 's/\x{2014}/-/g' /tmp/dash.txt; cat /tmp/dash.txt
```

Expected: the first substitution exits 0 and changes nothing; the
second works. A check based on the exit code would have passed the
first. Add the lesson to your plan's last column style: "byte count
changed" rather than "command succeeded."
