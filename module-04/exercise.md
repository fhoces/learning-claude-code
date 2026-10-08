# Module 4 drill: token management

In `~/claude-code-practice`, fresh session (`/clear` first).

## Q1. Baseline

> /context

Write down the total and the largest items. Expected: instruction
files (`CLAUDE.md`, the auto-memory index) and tool definitions
dominate an empty session.

## Q2. Read everything, the expensive way

> Read data/trips.csv in full and tell me how many trips have a rating
> of 5.

Then:

> /context

Expected: the CSV (5,000 rows) is now a large block in the window and
stays there. The answer was one number.

## Q3. The same question through a subagent

> /clear

> Use a subagent to count how many rows in data/trips.csv have
> rating == 5. The subagent should run a command, not read the file
> into its context. Report only the number.

> /context

Expected: the main window grew by the agent's summary, not by the
file. Note the agent's own usage from the completion block: it still
spent tokens, just not in your window. Note also the better fix for
this particular question, which needs no agent at all:

```bash
awk -F, 'NR>1 && $9==5' data/trips.csv | wc -l
```

## Q4. Compaction with an instruction

Make the session long enough to matter: have Claude run the metrics
script three times and read `SPEC.md` and `PLAN.md`. Then:

> /compact Keep the PLAN.md table and the last metrics output verbatim;
> drop everything else.

> /context

Expected: the window shrinks; the plan table survives. Now add a
`# Compact instructions` section to the practice repo's `CLAUDE.md`
with the same sentence, so it is the default.

## Q5. Watch the cache

> /usage

Expected: a `Prompt cache (main)` line with the request count, the
share of input from cache, misses and whether it is warm. Leave the
session idle for longer than the TTL shown (an hour on a subscription;
five minutes on an API key), send one short message, and run `/usage`
again. Expected: one more miss, the full context re-cached.

## Q6. The parallelization opinion

Take the brief you wrote in module 2 Q6 (add the exclusion rule
through a subagent). Before sending it, write three sentences: is this
worth a subagent in tokens, why or why not, and what you would lose in
the handoff. Then send it anyway, as the drill for module 5 needs the
commit:

> Launch a subagent with this brief: [paste]. Report its summary and
> its token usage.

Expected: the rule gets added and committed; the agent's usage is
visible in the completion block; your own opinion was probably "not
worth it for a ten-line change, but fine as a drill."
