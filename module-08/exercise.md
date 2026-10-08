# Module 8 drill: mods

In `~/claude-code-practice`, in an interactive session. Needs Node
with `tsc` for the type-check step (`npm i -g typescript`).

## Q1. Load the authoring skill and find the types

> /plugin-authoring

Expected: the skill names the folder this session's mods go in
(`~/.claude/dev-mods/<session>/`), the path of this build's
`types/claude-code.d.ts`, and the examples folder. Then:

```bash
grep -n "'tool.call'" <path-to>/types/claude-code.d.ts | head
grep -n "status(" <path-to>/types/claude-code.d.ts | head -3
```

Expected: the event's declaration and the `$.ui.status` doc comment.
This is the habit the module is about: grep the types, read the
declaration.

## Q2. Write the three files

> Make a mod called trip-guard: deny any Edit or Write to
> data/trips.csv with the message "generated file; edit
> data/build_data.R", show the last failed Bash command in the status
> line, and toast when a turn takes longer than 60 seconds.

Expected: three files under the mods folder (`plugin.json`,
`hooks/hooks.json`, `hooks/register.ts`), modeled on `tool-call.ts`
and `band.tsx`. Read `register.ts`. Check that the deny hook has a
`.catch` that refuses when `next` was not called; if it does not, ask
why.

When the harness asks "Enable hot reloading for this session?",
answer yes. The mod loads when the turn ends.

## Q3. Validate and type-check

```bash
claude plugin validate ~/.claude/dev-mods/<session>/trip-guard
tsc -p ~/.claude/dev-mods/<session>/trip-guard
```

Expected: validate lists the hooks (`tool.call` on Edit, Write, Bash;
`turn.complete`; `prompt.submit`), marks the deny hook as a "gating
hook with .catch", and reports nothing refused. `tsc` is silent.

## Q4. Trigger each behavior

> Change the first row of data/trips.csv.

Expected: denied with the mod's message (the module 7 shell hook, if
still installed, would also fire; disable it in `.claude/settings.json`
first to see the mod alone).

> Run a command that fails: ls /nonexistent

Expected: the status line shows `failed: ls /nonexistent`. A
successful command clears it.

> Run a task that takes over a minute (for example, sleep 70).

Expected: a toast when the turn completes.

## Q5. Write a test

> Add a trip-guard test that calls the Edit hook with file_path
> data/trips.csv and expects a deny, and one with data/trip_metrics.R
> that expects next to be called.

```bash
claude plugin test ~/.claude/dev-mods/<session>/trip-guard
```

Expected: both pass. Read the test: it imports `test`, `expect`,
`mock` from `claude-code/testing` and calls the hook through the
engine's `$.tool.call`.

## Q6. Break the guard and read the refusal

Remove the `.catch` from the deny hook and make the hook throw (a
typo in the regex method, say). Save; the mod reloads at the end of
the turn. Repeat the Q4 edit. Expected: **the edit goes through**, and
one dim transcript line names `trip-guard`, `tool.call`, and the
reason the hook was skipped. That is the whole argument for `.catch`
on a guard: a hook that throws is skipped and the chain continues
without it. Restore it.

## Q7. Share it (dry run)

```bash
cp -r ~/.claude/dev-mods/<session>/trip-guard ~/trip-guard
cat > ~/trip-guard/.claude-plugin/marketplace.json <<'JSON'
{ "name": "practice-mods", "owner": { "name": "me" },
  "plugins": [{ "name": "trip-guard", "source": "./" }] }
JSON
claude plugin validate ~/trip-guard
```

Expected: validate reads the marketplace file, the manifest and the
module in one run and reports clean. Pushing `~/trip-guard` to a
repository would let someone install it with
`/plugin install trip-guard --marketplace you/trip-guard`. Do not
push; the point is to see the shape.
