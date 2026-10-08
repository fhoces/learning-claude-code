# Module 8 drill: mods

The course ships two mods in `module-08/`: `things-you-should-know` (a
band above the prompt; the deck's running example) and `trip-guard` (a
guard that refuses edits). The drill runs the first, reads it, breaks
it, extends it, then runs the second and dry-runs sharing. Node with
`tsc` is optional (`npm i -g typescript`).

## Q1. Say what it should do, then run it

Before starting anything, write three lines by hand: what the band
should show, what it must never do, and what `/know` does. Compare with
the deck's spec slide. Then:

```bash
find ~ -maxdepth 4 -type d -name learning-claude-code -not -path '*/Library/*' 2>/dev/null
# prints this repo's full path, e.g. /Users/you/Desktop/courses/learning-claude-code
cd /Users/you/Desktop/courses/learning-claude-code     # paste the line it printed
COURSE=$(pwd)                                           # $COURSE now holds that path
ls "$COURSE/module-08/things-you-should-know"          # expect: hooks  types
cd ~/claude-code-practice
claude --plugin-dir "$COURSE/module-08/things-you-should-know" plugin list   # Status: loaded?
claude --plugin-dir "$COURSE/module-08/things-you-should-know"
```

In the session, `/plugin` should list it on the Installed tab. Then
these prompts, one at a time:

> Add a median_fare column to the per-city summary in data/trip_metrics.R.

> Create a README.md with one sentence describing this repo.

> Run: ls data/missing.csv

Expected: after the third, a band above the prompt with three lines:
`2 files edited since the last commit: trip_metrics.R, README.md`, the
last turn's seconds and tool calls, and
`last failed command: ls data/missing.csv`.

> Commit both files.

Expected: the "files edited" line disappears.

> Run: ls data

Expected: the "last failed command" line disappears.

> /know

Expected: the remaining facts as a transcript line. Press Hide on the
band, then `/know` again: the band is back.

## Q2. Check it without running it

```bash
cd "$COURSE"
claude plugin validate module-08/things-you-should-know
claude plugin test module-08/things-you-should-know
```

Expected from validate: the six hooks, the `$` methods it calls, and
the five state keys it reads and writes, matched against
`types/index.d.ts`. Expected from test: 5 pass, 0 fail. Read
`hooks/register.test.ts`: a test cannot read `$.state`, so it watches
`state.set` writes with a hook of its own.

## Q3. Read it in three parts

Open `hooks/register.tsx`. Write one line for each `on(...)` call: the
event, the matcher, and which of the four hook shapes it is (react
after `next`, pass through, answer for itself, rewrite). Then find:
the one line that subscribes the band to state changes, and the one
place state is written from a drawing's handler.

## Q4. Break it the way validate caught it

Copy the mod somewhere writable. In `register.tsx`, replace the
literal plugin name in one `atom(...)` with a variable:

```ts
const P = 'things-you-should-know'
const edited = atom({ plugin: P, key: 'edited' } as const, [])
```

```bash
claude plugin validate <copy>
```

Expected: validation fails, naming the compiled line and saying the
atom's source must be a literal the scan can read. Restore it. Then
make the render hook write state while drawing (an `update` call before
the `return`); run the mod and watch the transcript for the dim line
saying the write was refused.

## Q5. Extend it with the authoring skill

In a session in the practice repo:

> /plugin-authoring

> Copy module-08/things-you-should-know into this session's mods folder
> and add a fifth fact to the band: tokens used by the last turn, from
> e.usage on turn.complete. Add it to the contract, the atom list, the
> lines() helper, and a test.

Answer yes to "Enable hot reloading for this session?". Expected: the
band shows the new line after the next turn; `claude plugin validate`
lists the new state key; the new test passes. Note what the agent had
to grep in the types file to find the shape of `e.usage`.

## Q6. The guard variant

```bash
claude --plugin-dir "$COURSE/module-08/trip-guard"
```

> Change the rating of the first data row in data/trips.csv to 4.

> Do it with a sed -i command instead.

Expected: both refused, with a message pointing at the generator; Claude
offers to change `data/build_data.R` instead. Then, in a writable copy,
remove the `.catch` from the Edit/Write guard and make the hook throw
(`GENERATED.tst(...)`). Repeat the first prompt: the edit goes through,
and one dim transcript line names `trip-guard`, `tool.call`, and why
the hook was skipped. That is the argument for `.catch` on a guard.

## Q7. Share it (dry run)

```bash
cp -r module-08/things-you-should-know ~/things-you-should-know
cat > ~/things-you-should-know/.claude-plugin/marketplace.json <<'JSON'
{ "name": "practice-mods", "owner": { "name": "me" },
  "plugins": [{ "name": "things-you-should-know", "source": "./" }] }
JSON
claude plugin validate ~/things-you-should-know
```

Expected: validate reads the marketplace file, the manifest and the
module in one run and reports clean. Pushed to a repository, someone
installs it with
`/plugin install things-you-should-know --marketplace you/repo`. Do not
push; the point is to see the shape.
