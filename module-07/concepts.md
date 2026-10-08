# Module 7: Hooks

## What this module covers

Everything in modules 2, 5 and 6 is context: instructions the model
weighs. A hook is a command the harness runs at a named moment,
regardless of what the model decides. That is the one thing memory
and skills cannot give you: enforcement. This module covers the
events that matter day to day, the `settings.json` structure, how a
hook reads its input and returns a decision, the exit-code contract,
the patterns worth having (protect a file, prefilter noisy output,
format after an edit, gate a push, inject context at session start),
and how to debug a hook that seems to do nothing.

Reference: [Hooks reference](https://code.claude.com/docs/en/hooks)
and the [hooks guide](https://code.claude.com/docs/en/hooks-guide).

## Why hooks

From the memory docs, verbatim in spirit: `CLAUDE.md` and auto memory
are context, not enforced configuration. To block an action regardless
of what Claude decides, use a `PreToolUse` hook. The signal that a rule
needs to move from memory to a hook: it starts with "always" or
"never" and the cost of one slip is high. "Never edit `.env`", "never
push without the flag file", "always run the linter after an R edit."

A second reason, from module 4: a hook can rewrite a command before it
runs, so a test suite's output reaches the model already filtered.

## The events

The full list is long (over thirty). The ones a research workflow
uses:

| Event | Fires | Can block |
|---|---|---|
| `SessionStart` | session begins or resumes | no; stdout goes to context |
| `UserPromptSubmit` | prompt submitted, before Claude sees it | yes |
| `PreToolUse` | before a tool call runs | yes |
| `PostToolUse` | after a tool call succeeds | no (tool already ran); stderr shown to Claude |
| `PostToolUseFailure` | after a tool call fails | no |
| `Stop` | Claude finishes responding | yes (can send it back to work) |
| `SubagentStart` / `SubagentStop` | a subagent spawns / finishes | no |
| `PreCompact` / `PostCompact` | around compaction | no |
| `Notification` | Claude Code sends a notification | no |
| `SessionEnd` | session terminates | no |

Others exist for permission requests, model switches, worktree
creation, config changes, file watches and MCP elicitation.

## Configuration

Hooks live in `~/.claude/settings.json` (user), `.claude/settings.json`
(project, shared), `.claude/settings.local.json` (project, private),
managed settings, a plugin's `hooks/hooks.json`, or a skill's or
subagent's frontmatter. Three nesting levels: event, matcher group,
handlers.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-data.sh",
            "timeout": 10 }
        ]
      }
    ]
  }
}
```

- `matcher`: for tool events, matched against `tool_name`. Plain
  names and `|` are exact (`Edit|Write`); any other character makes
  it a regex (`mcp__.*`). Omitted, `""` or `"*"` matches everything.
- `if`: a permission rule (`"Bash(git push *)"`) that filters tool
  events further, so the script only runs for matching commands.
- `type`: `command` (a shell command), `prompt` or `agent` (a model
  evaluates), `http`, `mcp_tool`.
- `timeout` in seconds (default 600); `async: true` runs in the
  background without blocking.

`/hooks` shows what is configured. Changes to settings files are
picked up during the session (the `ConfigChange` event exists for
that).

## Input and output

A command hook reads one JSON object on stdin. Common fields:
`session_id`, `transcript_path`, `cwd`, `permission_mode`,
`hook_event_name`. Tool events add `tool_name`, `tool_input` (the
tool's arguments, e.g. `tool_input.command` for Bash,
`tool_input.file_path` for Edit) and `tool_use_id`. `jq` is the tool
for reading it.

Exit codes:

- **0**: success. If stdout is a JSON object, it is parsed as a
  decision. Otherwise, for `UserPromptSubmit` and `SessionStart` plain
  stdout is added to Claude's context; for other events it goes to
  the debug log only.
- **2**: blocking error. On events that can block, the action is
  stopped and **stderr** is the reason Claude sees. On `PostToolUse`
  the tool already ran, so stderr is shown to Claude as feedback.
- **anything else**: non-blocking error; the action proceeds, the
  first line of stderr shows in the transcript. Exit 1 does not block.

JSON output, exit 0, for finer control:

```json
{ "hookSpecificOutput": { "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "data/trips.csv is generated; edit build_data.R instead" } }
```

`permissionDecision` is `allow`, `deny`, `ask` or `defer`;
`updatedInput` rewrites the tool's arguments (the prefilter pattern);
`additionalContext` injects text as a system reminder. Other events
use a top-level `{"decision": "block", "reason": "..."}`. A universal
`{"continue": false, "stopReason": "..."}` stops Claude entirely.

## Patterns

**Protect a file.** `PreToolUse` on `Edit|Write`; read
`tool_input.file_path`; if it matches, exit 2 with the reason on
stderr (or the JSON deny). The drill protects `data/trips.csv`.

**Prefilter noisy output.** `PreToolUse` on `Bash`; if the command is
a test runner, return `updatedInput` with the command piped through
`grep` and `head`. Module 4 showed it.

**Format after an edit.** `PostToolUse` on `Edit|Write`; if the path
ends in `.R`, run `styler` or `lintr` on it. Exit 2 with the lint
output on stderr makes Claude see and fix it; exit 0 keeps it quiet.

**Gate a push.** `PreToolUse` on `Bash` with `if: "Bash(git push *)"`;
deny unless a flag file exists (`.push-ok`, created by you, deleted by
the hook after one use). This is the module 1 rule, enforced.

**Inject context at session start.** `SessionStart`; print the current
branch, open todo items, or the last handoff note to stdout. It lands
in context without anyone pasting it.

**Send the model back to work.** `Stop`; run the test suite; on
failure return `{"decision": "block", "reason": "tests fail: ..."}`.
Use with care: a `Stop` hook that blocks on something the model cannot
fix makes a loop.

## Debugging

- `/hooks` lists what is registered and from which file.
- The script must be executable (`chmod +x`) and its interpreter line
  valid; a hook that fails to start is a non-blocking error you may
  miss in a busy transcript.
- `claude --debug` (or `--debug-file path`) logs every hook run, its
  exit code, and for a rewrite the "modified tool input keys" line.
- Test the script by hand: build the stdin JSON with `jq -n` and pipe
  it in; check the exit code and stderr.
- A hook in `.claude/settings.json` committed by someone else runs on
  your machine once you trust the workspace. Read a repo's hooks before
  trusting it.

Automation rules in this collection's instructions ("from now on,
whenever X") are implemented as hooks, not memory, for the reason this
module opened with: memory is advice.

## The drill

`exercise.md` writes three hooks for the practice repo (protect the
CSV, gate `git push`, lint after R edits), triggers each from a live
session, reads the transcript line and the debug log, and tests one
script by hand with piped-in JSON.
