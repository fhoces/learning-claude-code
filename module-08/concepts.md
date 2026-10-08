# Module 8: Mods

## What this module covers

A hook (module 7) is a shell command the harness runs at a named
moment. A mod is the same idea with the whole engine exposed: a plugin
of *function hooks* written in TypeScript, loaded into Claude Code,
that can draw a pane or a band above the prompt, set the status line,
show a toast, register a slash command, block or rewrite a tool call,
rewrite a prompt, and keep state that survives reloads. This module
covers what a mod is and is not, the three files, the one function
signature every hook has, the catalogue of things a mod can do, the
authoring loop (hot reload, validate, test), and how to share one.

The API is early access and moves between releases. The generated
types file is the authority; this module is the map.

Reference: the `plugin-authoring` skill bundled with Claude Code (its
`SKILL.md`, `reference.md` and `examples/`), and the
[plugins docs](https://code.claude.com/docs/en/plugins).

## Start from the one in this repo

`module-08/trip-guard/` is a complete, tested mod. Run it from any
repo with:

```bash
claude --plugin-dir <learning-claude-code>/module-08/trip-guard
```

It does three things, each one hook:

1. **Denies** any `Edit` or `Write` whose path is `data/trips.csv`, with
   a message pointing at the generator. Claude reads the message as an
   error result and changes course.
2. **Sets the status line** to `failed: <command>` after a Bash call
   that errored, and clears it after one that succeeded.
3. **Toasts** when a turn took longer than a minute.

`claude plugin validate module-08/trip-guard` lists exactly those three
hooks and the two `$` methods they call; `claude plugin test
module-08/trip-guard` runs its three tests against the engine itself.
The rest of this file explains what you just ran.

## What a mod is

A plugin is a folder with a `.claude-plugin/plugin.json` manifest. It
can carry skills (`skills/`), command hooks (`hooks/hooks.json` in the
module 7 shape), and a *hooks module*: one TypeScript or JavaScript
file named under `modules` in `hooks/hooks.json`, exporting
`register(on, options)`. A mod is a plugin whose substance is that
module.

```
trip-guard/
├── .claude-plugin/plugin.json     {"name":"trip-guard","version":"0.1.0","description":"..."}
├── hooks/hooks.json               {"modules":["./register.ts"]}
└── hooks/register.ts              export const register: Register = (on, options) => { ... }
```

A mod that keeps values in `$.state` adds `types/index.d.ts`, its
state contract, named in the manifest as `"types"`.

The module runs in an environment of its own: no DOM, no Node.
Everything outside it is reached through `$`, the engine interface.

## The one signature

```ts
on(event, matcher?, hook)
hook = ($, e, next) => result
```

- `$` is the engine, each call spelled noun then method: `$.ui.toast`,
  `$.ui.status`, `$.clock.now`, `$.state.get`, `$.command.register`,
  `$.tool.call`, `$.fs`, `$.process.spawn`, `$.model`.
- `e` is the event's input, a plain frozen value. For `tool.call` it
  narrows by tool: `e.tool === 'Edit'` gives `e.file_path`.
- `next(e)` runs the plugins beneath and then the engine's own
  behavior, and resolves to the event's result. A hook that returns
  without calling `next` answers for itself (`{ deny: '...' }`). A hook
  that calls `next({ ...e, command: e.command.trim() })` rewrites what
  the rest of the chain sees. A hook that does `await next(e)` and then
  acts on the result reacts after the fact.

Events: `tool.call`, `prompt.submit`, `prompt.compose` (the system
prompt's sections), `session.start`, `session.end` (a `/clear` is
`reason: 'clear'`), `turn.complete`, `turn.step` (streams),
`command.run`, `ui.render`, `state.set`, and the module 7 events as
`classic.<Event>` with the same stdin shape. The matcher narrows:
`{ tool: 'Bash' }`, `{ component: 'AbovePrompt' }`.

## The catalogue

| You want | It is | Example file |
|---|---|---|
| a pane, panel, sidebar, live view | `$.ui.open({ id, title })` + a `ui.render` hook on `{ component: 'Pane', requestId: id }` | `pane.tsx` |
| a band above the prompt | `ui.render` on `{ component: 'AbovePrompt' }` returning a tree, or `next(e)` for nothing | `band.tsx` |
| a status line entry | `$.ui.status(text)` from any hook; `undefined` clears | `tool-call.ts` |
| a toast | `$.ui.toast(text)` | `band.tsx` |
| block, rewrite or react to a tool call | `on('tool.call', { tool }, hook)` | `tool-call.ts` |
| change or react to a prompt | `on('prompt.submit', hook)` → `next({ ...e, text })` | `band.tsx` |
| change the system prompt | `on('prompt.compose', hook)`: add, replace or drop a section | types |
| a slash command | `$.command.register({ name, description })` in `session.start`; a `command.run` hook returns `{ text }` | `pane.tsx` |
| values a drawing reads | `atom(ref, initial)`, `read($, atom)` while drawing, `update($, atom, fn)` from a handler | `pane-state.d.ts` |
| timers, a tool the model calls, subagents, model calls, files, processes | `$.clock`, `$.tool`, `$.agent`, `$.model`, `$.fs`, `$.process` | `reference.md` |

JSX compiles against a global `h`; the elements come from
`const { Box, Text, Button } = $.ui.resolve(e)`, which gives the right
table for `e.surface` (`terminal`, `desktop`, `vscode`, `mobile`).

Two complete examples from the skill:

```ts
// tool-call.ts: protect .env, and show the last failed command in the status line
import type { Register } from 'claude-code'
const PROTECTED = /(^|\/)\.env(\.|$)/
export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, ($, e, next) =>
    PROTECTED.test(e.file_path)
      ? { deny: `${$.plugin.name}: ${e.file_path} is protected here.` }
      : next(e),
  ).catch(($, e, next) =>
    next.called ? next(e) : { deny: `${$.plugin.name}: its guard failed.` },
  )
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next({ ...e, command: e.command.trim() })
    const hasFailed = ran.deny === undefined && ran.isError === true
    $.ui.status(hasFailed ? `failed: ${e.command.slice(0, 40)}` : undefined)
    return ran
  })
}
```

The `.catch` matters: a hook that throws is skipped and the chain
continues without it, so a *guard* needs a handler that refuses in its
place when `next` was never called. The band example (`band.tsx`)
times each turn with `$.clock.now()` across `prompt.submit` and
`turn.complete`, stores the result with `update($, atom, ...)`, toasts
when a turn passes 120 seconds, and draws a dismissable line above the
prompt from a `ui.render` hook.

## State

Module variables reset on every reload. Values a drawing reads belong
in `$.state` (the session's) or `$.store` (across sessions): named,
versioned, declared in the contract (`interface PluginState { ... }`
under the plugin's name), referred to by a typed `{ plugin, key }`
reference. A render hook reads (`read($, atom)`), which subscribes it;
a handler writes (`update($, atom, fn)`), which redraws the readers.
A render hook never writes.

## The authoring loop

1. **Load the skill.** `/plugin-authoring` (or ask for "a mod that
   ..."). It names the session's mods folder and writes this build's
   `types/claude-code.d.ts`: the full API, about 14,000 lines. Grep it
   for the name at hand (`'tool.call'`, `Pane: {`) and read the
   declaration it lands on.
2. **Write the three files** into the mods folder. The first write
   makes the engine ask you once: "Enable hot reloading for this
   session?" On yes, the mod loads when the turn ends and reloads on
   every later edit. A reload is a fresh `register`; `$.state` and
   `$.store` survive, module variables do not.
3. **Validate.** `claude plugin validate <folder>` reads the manifest
   and the module the way the engine will, and lists what it hooks,
   what it calls, which hooks are gates (and whether they have a
   `.catch`), and everything the engine would refuse.
4. **Type-check.** Once loaded, the mod folder has
   `.claude-plugin/types/` laid beside it and a `tsconfig.json` to
   extend: `tsc -p <folder>`.
5. **Test.** At least one `*.test.ts` for the behavior asked for;
   `claude plugin test <folder>` runs it against the engine itself,
   with a mocked clock and a mounted surface for UI.
6. **Read what the engine refused.** While hot reloading, a dim
   transcript line names the plugin, the event and the reason when a
   hook fails or a tree does not validate. `claude --debug` has every
   occurrence.

Outside the session: `claude --plugin-dir <folder>` loads a mod from
disk for one session; `CLAUDE_CODE_PLUGIN_DIRS` does the same where no
flag can be given. An interactive session watches the folder and
reloads on save.

## Sharing

Copy the mod out of the session's mods folder to a repository. Add
`.claude-plugin/marketplace.json` beside the manifest:

```json
{ "name": "my-mods", "owner": { "name": "me" },
  "plugins": [{ "name": "trip-guard", "source": "./" }] }
```

Another person installs with `/plugin install trip-guard --marketplace
owner/repo`, answers `y` to add the marketplace, picks a scope, and the
hooks run from then on. `claude plugin validate` checks the
marketplace file too.

## Mod, hook, skill: the last row of the ladder

| Layer | Form | Runs | Can draw UI |
|---|---|---|---|
| memory | Markdown, loaded as context | model decides | no |
| skill | Markdown + scripts, on demand | model decides to invoke | no |
| hook | shell command in `settings.json` | harness, at an event | no |
| mod | TypeScript function hooks in a plugin | engine, at an event, with `$` | yes |

A hook is enough when the answer is "block / rewrite / run a command."
A mod is the tool when the answer involves the screen, state across
events, a slash command, or the chain of other plugins.

## The drill

`exercise.md` runs the shipped `trip-guard` with `--plugin-dir`,
validates and tests it, reads it hook by hook, breaks the guard to see
what the engine does with a hook that throws, extends it with a band
above the prompt through the `plugin-authoring` skill, and dry-runs the
marketplace file.
