# Module 4: Token management

## What this module covers

Every request Claude Code makes carries the whole conversation: the
instruction files, every tool result so far, every file read. Cost and
context limits are the same problem seen from two sides. This module
is about what fills the context window, what prompt caching does and
does not save, how to see the numbers, and the levers that keep a
long session cheap: clearing, compacting, delegating verbose work,
prefiltering with hooks, loading instructions on demand, and the
honest arithmetic of parallel agents.

Reference: [Manage costs effectively](https://code.claude.com/docs/en/costs)
and [Prompt caching](https://code.claude.com/docs/en/prompt-caching).

## The model of cost

Three facts explain nearly every surprise:

1. **The conversation is resent on every request.** Each time Claude
   uses a tool, another request goes out carrying that batch of tool
   results. A one-line question in a session that has been open all
   day still carries the day.
2. **The cache makes resending cheaper, not free.** Cached input is
   billed at the cache-read rate, a fraction of the full rate, as long
   as the cached prefix is unchanged and still warm. The lifetime is an
   hour on a subscription, five minutes on an API key or once usage
   credits are drawn on. The first message after a longer break
   re-processes the full context at full rate.
3. **Anything that changes the prefix invalidates it.** Tool
   definitions changing (an MCP server connecting), a model switch,
   compaction. `/usage` names the likely cause of the last miss.

The visible consequences: idle sessions still spend (scheduled tasks
and cross-session messages each send the full context when they fire;
a `/loop` that polls every minute is a full-context request every
minute); a session resumed after lunch costs a cache rebuild; and a
`/compact` on a large context is itself a large request.

## What fills the context

Run `/context` to see the breakdown. The usual suspects, largest first
in a typical research session:

- **Tool output.** A `cat` of a 3,000-line log, a `git diff` of a
  rendered HTML file, a test suite's full output. Each lands in the
  context and stays there until compaction.
- **File reads.** Reading a whole file when the task needs one
  function. Reading the same file twice after an edit.
- **Instruction files.** `CLAUDE.md` at every level plus imports, the
  auto-memory index. Paid on every request, which is why module 2 set
  a 200-line budget and moved playbooks out.
- **Tool definitions.** MCP servers used to add every tool's schema;
  they are now deferred by default, so only names and server
  instructions load until a tool is used. A CLI (`gh`, `aws`) still
  costs less than a server because it adds no listing at all.
- **Thinking.** Billed as output tokens. The default budget can be
  tens of thousands of tokens per request on complex work; `/effort`
  lowers it for simple tasks.

## Seeing the numbers

- `/usage`: session tokens by model, estimated cost, a prompt-cache
  line (requests, share of input from cache, misses with a likely
  cause, warm or cold), and on a subscription the plan bars plus an
  attribution breakdown by skill, subagent, plugin and MCP server.
- `/context`: what is in the window right now.
- The status line can show context use continuously; configure it
  once and stop guessing.
- `/insights`: a report on friction patterns across recent sessions,
  not on tokens.

## The levers

**Clear between tasks.** `/clear` starts a new session at zero cost.
`/rename` first so `/resume` can find it. Stale context is paid for on
every later message, so "I'll just ask one more thing" in a six-hour
session is not one more thing.

**Compact with instructions.** `/compact Focus on the plan table and
the test output` tells the summarizer what to keep. A `# Compact
instructions` section in `CLAUDE.md` makes that the default.
Auto-compaction fires near the window limit either way. Compaction
reads the whole conversation, so it is cheaper to compact at 40% than
at 90%, and cheaper still to clear if continuity is not needed.

**Delegate verbose work to subagents.** A subagent's tool output stays
in its context; only its summary returns. Running a test suite,
reading documentation, processing a log: send them out. The subagent's
requests still count, so pick a smaller model for simple work.

**Prefilter with hooks.** A `PreToolUse` hook can rewrite `npm test`
into `npm test 2>&1 | grep -A5 FAIL | head -100` before it runs:
hundreds of tokens instead of tens of thousands. Module 7 builds one.

**Move procedures from `CLAUDE.md` to skills.** A skill's body loads
only when invoked. The 200-line instruction file plus on-demand
playbooks is this lever applied.

**Write specific prompts.** "Improve this codebase" triggers a scan;
"add the exclusion rule from SPEC.md to data/trip_metrics.R" reads
two files.

**Plan mode for anything large.** Shift+Tab to plan mode; the agent
explores and proposes before editing. Re-work after a wrong direction
is the most expensive token there is. Escape stops a turn early;
`/rewind` restores a checkpoint.

**Match model and effort to the task.** Sonnet for most coding; Opus
for architecture and multi-step reasoning. A switch to Opus also
applies to subagents that inherit the session's model.

## Parallel agents: the honest arithmetic

Each agent carries its own context: instruction files, its brief, its
own tool output. Four agents on a task cost roughly four times a
single pass plus the main session's coordination, and the handoffs
lose detail in both directions (the brief is all the agent knows; the
summary is all you get back). The rule in this collection's
instructions: when asked to parallelize, first say whether it is worth
it.

Worth it: large independent sweeps (one agent per artifact over a
shared spec), adversarial verification (a fresh agent re-deriving
numbers), work that must not block the main thread.

Not worth it: small or tightly coupled work, a check you could run
inline in a handful of calls, a review that would anchor on your own
conclusion if you handed it over.

Agent teams (several full instances in plan mode) run at roughly seven
times a standard session. Keep them for work that is actually
parallel.

### Agent deaths look like completions

A background agent's "completed" notification can be a session-limit
death: result text "You've hit your session limit", near-zero tokens,
a handful of tool uses. A real agent burns 100k+ tokens. Glance at the
usage block before acting on any result. After the reset, `SendMessage`
to the agent's id resumes it with its transcript; tell it to read
`git diff` first to recover uncommitted edits, and to commit per chunk
so the next interruption loses less.

## The drill

`exercise.md` measures `/context` before and after reading the whole
trip CSV, redoes the same question through a subagent and compares,
sets a compaction instruction, and writes the one-paragraph "is this
worth parallelizing" opinion for the module 2 brief.
