# Module 3: Verification plans

## What this module covers

The rule this collection's global instructions put at the top: before
doing any work, say how the work could be verified. This module is
about what a verification plan is, why the agent's own "I checked it"
is not one, which checks actually catch what, and the half-dozen ways a
check can report success on a failure. The running example is a change
to the practice repo's metrics script: adding the exclusion rule from
module 2's spec.

Reference: the docs' advice to
[give verification targets](https://code.claude.com/docs/en/costs#work-efficiently-on-complex-tasks)
in the prompt, and the sibling course
[admin-data-pipelines, module 8](https://github.com/fhoces/admin-data-pipelines)
(golden datasets for AI-edited pipelines).

## Why "I verified it" is not verification

The agent reports completion in the same register whether the work is
right or wrong, and its self-checks have a measured blind spot. In one
fleet build (seven slide decks, one agent each, every agent told to
render and self-verify), all seven passed their self-checks and all
seven had real visual breakage. The builder cannot see the rendered
page it is reasoning about unless it rasterizes and reads it, and even
then it is anchored on what it meant to produce.

So a verification plan has two properties:

1. It is **stated before the work**, so it cannot be fitted to whatever
   came out.
2. It is **run by something other than the author's reasoning**: a
   test, a render read back, a second agent, a number recomputed from
   the raw source.

## Three levels of check

**Existence.** The file is there, the render finished, the command
exited 0. Necessary, never sufficient. Most false positives live here.

**Correctness.** The artifact has the property the spec names. A test
asserts it; a golden output matches; a screenshot read back shows the
title and no clipping; `stopifnot()` at render time ties a slide's
number to the pipeline's own figure so drift fails the build.

**Intent.** The change does what was asked and nothing else. The diff
is the size of the request. A verifier that did not write the change
re-derives the key numbers from the raw source. A findings table lists
each claim with where it was checked.

A plan names which level each check reaches. "Rendered without
errors" is existence; "page 12 rasterized and read, title present,
last text row above 700 px" is correctness.

## Checks that work

- **Render, then read.** For anything visual (slides, a PDF page, a web
  page): print to PDF or screenshot, rasterize, `Read` the image. Grep
  on the rendered HTML proves nothing for xaringan, which embeds the
  source escaped.
- **Golden output.** Run the script before and after on the same input
  and diff the outputs. For a change that should alter the output,
  predict the delta first ("three fewer rows per the exclusion rule;
  mean fare moves by less than a cent").
- **Independent re-derivation.** A fresh agent, given the raw source
  and not the author's conclusion, recomputes each number. In a
  review loop this caught a hand-written annotation that was wrong
  while every computed number passed: verify annotations, not just
  computations.
- **Render-time assertions.** `stopifnot(total == pipeline_total)` in
  a slide chunk: a drift fails the render instead of shipping.
- **Definition, not just value.** Before citing a derived number, read
  its definition in the pipeline. Two different estimands can round to
  the same display value (48% as "remaining missing" and 48% as
  "availability rose to"), so a check that compares values passes a
  semantic error.

## Checks that lie

Each of these reported success on a failure in a real session.

- **The stale artifact.** `until [ -f /tmp/out.png ]; do sleep 1; done`
  exits immediately on yesterday's file. `rm -f` the target before
  polling, or compare `mtime` against the source.
- **The silent no-op.** `perl -pe 's/\x{2014}/-/g'` without `-CSD`
  matches nothing and exits 0. `sed -i 's/\bAI\b/x/'` on macOS: no
  word boundary in BSD sed, exit 0, nothing changed. Check that a
  substitution changed the byte count or diff the file.
- **The wrong "completed".** `cmd > log 2>&1 &` with
  `run_in_background` reports completion when the wrapper exits, not
  the process. A background agent's "completed" can be a session-limit
  death with near-zero tokens. Glance at the usage block; `ps` or tail
  the log.
- **The half-run chain.** A `&&` chain that aborts at a failed `cd`
  while the `;`-separated tail still runs without the exported
  variable; a `grep` exiting 1 on the good result (zero em-dashes)
  skipping the commit chained after it. Separate diagnostics from
  mutations.
- **The false-negative search.** `ugrep` returned nothing for a phrase
  that was in the file. Before concluding something is absent, confirm
  with a second tool.
- **The print-to-PDF dropout.** Chrome's print can drop the last reveal
  of a slide or collapse every `count: false` group to one page.
  Cross-check with `--dump-dom` or screenshot the URL state directly;
  if an untouched baseline slide shows the same truncation, it is the
  tool, not the edit.
- **Low-DPI misreads.** A 42-dpi raster made "826,216" look like
  "B26,216". Re-render the region at 150 dpi before flagging a digit.

## Writing the plan

Four columns, one row per check:

| Artifact | Check | Level | What failure looks like |
|---|---|---|---|
| `trip_metrics.R` | runs clean on `trips.csv` | existence | non-zero exit |
| output | prints "3 rows excluded" first | correctness | any other count |
| output | per-city `trips` sum to 4997 | correctness | 5000 (rule not applied) |
| diff | only the summarise block and one filter line changed | intent | any other hunk |

The last column is the discipline: if you cannot say what failure
would look like, the check is not a check. A row that reads "looks
right" is existence pretending to be correctness.

Give the plan to Claude as part of the prompt. The docs say the same
thing from the cost side: a verification target lets the agent catch
its own misses before you have to.

## The drill

`exercise.md` writes the plan for the exclusion rule, has Claude
implement it, runs every row, then injects a bug (the rule applied
after the summary instead of before) and shows which row catches it.
It ends with a plan that would have passed the bug, to make the gap
concrete.
