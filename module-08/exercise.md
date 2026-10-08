# Module 8 drill: mods

The course ships a working mod in `module-08/trip-guard/`. The drill
runs it, reads it, tests it, breaks it, extends it, and dry-runs
sharing it. Needs Node for the type-check step (`npm i -g typescript`,
optional).

## Q1. Run the shipped mod

```bash
COURSE=~/path/to/learning-claude-code      # the real folder where you cloned this repo
cd ~/claude-code-practice
claude --plugin-dir "$COURSE/module-08/trip-guard"
```

If the path is wrong the session starts without the mod and nothing
warns you. Check before trusting it: `/plugin` lists the mod on the
Installed tab, and from the shell
`claude --plugin-dir "$COURSE/module-08/trip-guard" plugin list` prints
it as `trip-guard@inline` with `Status: ✔ loaded`. After editing the mod's files, `/reload-plugins`
in the session.

Inside the session, four prompts:

> Change the rating of the first data row in data/trips.csv to 4.

Expected: the edit is refused with the mod's message naming
`data/build_data.R`. Claude reads the reason and offers to change the
generator instead.

> Do it with a sed -i command instead.

Expected: refused too, by the Bash half of the guard. The first version
of this mod only guarded the Edit and Write tools, and the first learner
to run it got the file changed through Bash. A guard has to cover every
way the thing can happen.

> Run: ls /nonexistent

Expected: the status line reads `failed: ls /nonexistent`. Then
`Run: ls data` clears it.

> Run: sleep 65

Expected: a toast at the end of the turn saying how long it took.

## Q2. Check it without running it

```bash
cd <learning-claude-code>
claude plugin validate module-08/trip-guard
claude plugin test module-08/trip-guard
```

Expected from validate: the hooks it registers
(`tool.call{tool=Edit|Write}`, `tool.call{tool=Bash}`, `turn.complete`),
each gate marked "with .catch", and the `$` methods it calls. Expected
from test: 3 pass, 0 fail. Read `hooks/register.test.ts`: each test
registers a bottom hook standing in for the engine and calls the tool
through `$.tool.call`.

## Q3. Read it

Open `hooks/register.ts`. For each of the three `on(...)` calls, write
one line: the event, the matcher, and which of the three hook shapes it
is (answers for itself, rewrites, or reacts after `next`). Then find
the line that makes the guard safe when the hook itself throws.

## Q4. Break the guard and read the refusal

Copy the mod somewhere writable, remove the `.catch` from the Edit/Write
guard, and make the hook throw (replace `GENERATED.test(e.file_path)`
with `GENERATED.tst(e.file_path)`). Then:

```bash
claude plugin validate <copy>        # now: "gating hook without .catch"
claude plugin test <copy>            # the deny test fails
claude --plugin-dir <copy>
```

In the session, repeat Q1's edit. Expected: **the edit goes through**,
and one dim transcript line names `trip-guard`, `tool.call`, and the
reason the hook was skipped. That is the whole argument for `.catch` on
a guard. `claude --debug` shows the same line in full.

## Q5. Extend it with the authoring skill

In a session in the practice repo:

> /plugin-authoring

> Copy module-08/trip-guard into this session's mods folder and add a
> band above the prompt that shows the last turn's duration and tool
> count, with a Hide button, modeled on the skill's band.tsx example.

When asked "Enable hot reloading for this session?", answer yes.
Expected: after the turn ends, the band appears under the next turn.
Read the new `ui.render` hook: it reads an atom, resolves `Box`, `Text`
and `Button` from `$.ui.resolve(e)`, and never writes state while
drawing. Run `claude plugin validate` on the mods folder copy; it now
lists `ui.render{component=AbovePrompt}` and `$.state` keys against the
contract in `types/index.d.ts`.

## Q6. Share it (dry run)

```bash
cp -r module-08/trip-guard ~/trip-guard
cat > ~/trip-guard/.claude-plugin/marketplace.json <<'JSON'
{ "name": "practice-mods", "owner": { "name": "me" },
  "plugins": [{ "name": "trip-guard", "source": "./" }] }
JSON
claude plugin validate ~/trip-guard
```

Expected: validate reads the marketplace file, the manifest and the
module in one run and reports clean. Pushed to a repository, someone
installs it with `/plugin install trip-guard --marketplace you/trip-guard`.
Do not push; the point is to see the shape.
