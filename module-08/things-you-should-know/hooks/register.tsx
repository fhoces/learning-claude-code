import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Turn } from '../types'

// The facts the band shows. They live in $.state, not in module variables,
// so a hot reload of this file does not lose them.
const changed = atom({ plugin: 'things-you-should-know', key: 'changed' } as const, [])
const lastTurn = atom({ plugin: 'things-you-should-know', key: 'lastTurn' } as const, null)
const lastFailed = atom({ plugin: 'things-you-should-know', key: 'lastFailed' } as const, null)
const claudeMdLines = atom({ plugin: 'things-you-should-know', key: 'claudeMdLines' } as const, null)
const isHidden = atom({ plugin: 'things-you-should-know', key: 'isHidden' } as const, false)

const CLAUDE_MD_BUDGET = 200

// Ask git which files differ from the last commit: modified, staged, new or deleted.
// This counts a change however it was made (the Edit tool, a sed or python script
// run through Bash, your own editor) and clears after a commit. Outside a git
// repository, or if git fails, the line is simply left out.
async function refreshChanged($: EngineInterface) {
  let files: string[] = []
  try {
    const { exitCode, stdout } = await $.process.run(['git', 'status', '--porcelain'])
    if (exitCode === 0) {
      files = stdout
        .split('\n')
        .filter(line => line.length > 3)
        .map(line => (line.slice(3).split(' -> ').pop() ?? '').replace(/^"|"$/g, ''))
    }
  } catch {
    // git missing or too slow: leave the line out
  }
  await update($, changed, () => files)
}

function lines(files: readonly string[], turn: Turn | null, failed: string | null, md: number | null) {
  const out: string[] = []
  if (files.length > 0) {
    const names = files.slice(0, 3).map(p => p.split('/').pop()).join(', ')
    out.push(`${files.length} file${files.length === 1 ? '' : 's'} changed since the last commit: ${names}${files.length > 3 ? ', ...' : ''}`)
  }
  if (turn) out.push(`last turn: ${turn.seconds} s, ${turn.tools} tool call${turn.tools === 1 ? '' : 's'}`)
  if (failed) out.push(`last failed command: ${failed}`)
  if (md !== null && md > CLAUDE_MD_BUDGET) out.push(`CLAUDE.md is ${md} lines; the docs suggest under ${CLAUDE_MD_BUDGET}`)
  return out
}

export const register: Register = on => {
  let tools = 0

  // At session start: register /know, measure the project CLAUDE.md, ask git.
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'know', description: 'Things you should know about this session' })
    try {
      if (await $.fs.exists('CLAUDE.md')) {
        const file = await $.fs.read('CLAUDE.md')
        const text = typeof file === 'string' ? file : ''
        await update($, claudeMdLines, () => text.trimEnd().split('\n').length)
      }
    } catch {
      // a surface without file access: the band simply omits the line
    }
    await refreshChanged($)
    return next(e)
  })

  // /know asks git again, prints the facts as text, and brings the band back if hidden.
  on('command.run', { command: 'know' }, async $ => {
    await refreshChanged($)
    await update($, isHidden, () => false)
    const text = lines(await read($, changed), await read($, lastTurn), await read($, lastFailed), await read($, claudeMdLines))
    return { text: text.length ? text.join('\n') : 'Nothing to report yet.' }
  })

  // Count tool calls per turn; remember the last Bash command that failed.
  on('prompt.submit', ($, e, next) => {
    tools = 0
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    tools += 1
    const ran = await next(e)
    if (e.tool === 'Bash') {
      const ok = ran.deny === undefined && ran.isError !== true
      await update($, lastFailed, () => (ok ? null : e.command.slice(0, 60)))
    }
    return ran
  })

  // At the end of each turn: what it cost, and what git now says changed.
  on('turn.complete', async ($, e, next) => {
    await update($, lastTurn, () => ({ seconds: Math.round(e.durationMs / 1000), tools }))
    await refreshChanged($)
    return next(e)
  })

  // The band: one dim line per fact, and a Hide button.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const text = lines(await read($, changed), await read($, lastTurn), await read($, lastFailed), await read($, claudeMdLines))
    if (text.length === 0) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {text.map(line => (
          <Text dimColor>{line}</Text>
        ))}
        <Button key="hide" label="Hide (/know brings it back)" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
