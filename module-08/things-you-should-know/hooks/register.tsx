import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Turn } from '../types'

// The facts the band shows. They live in $.state, not in module variables,
// so a hot reload of this file does not lose them.
const edited = atom({ plugin: 'things-you-should-know', key: 'edited' } as const, [])
const lastTurn = atom({ plugin: 'things-you-should-know', key: 'lastTurn' } as const, null)
const lastFailed = atom({ plugin: 'things-you-should-know', key: 'lastFailed' } as const, null)
const claudeMdLines = atom({ plugin: 'things-you-should-know', key: 'claudeMdLines' } as const, null)
const isHidden = atom({ plugin: 'things-you-should-know', key: 'isHidden' } as const, false)

const CLAUDE_MD_BUDGET = 200

function lines(edits: readonly string[], turn: Turn | null, failed: string | null, md: number | null) {
  const out: string[] = []
  if (edits.length > 0) {
    const names = edits.slice(-3).map(p => p.split('/').pop()).join(', ')
    out.push(`${edits.length} file${edits.length === 1 ? '' : 's'} edited since the last commit: ${names}${edits.length > 3 ? ', ...' : ''}`)
  }
  if (turn) out.push(`last turn: ${turn.seconds} s, ${turn.tools} tool call${turn.tools === 1 ? '' : 's'}`)
  if (failed) out.push(`last failed command: ${failed}`)
  if (md !== null && md > CLAUDE_MD_BUDGET) out.push(`CLAUDE.md is ${md} lines; the docs suggest under ${CLAUDE_MD_BUDGET}`)
  return out
}

export const register: Register = on => {
  let tools = 0

  // At session start: register /know, and measure the project CLAUDE.md once.
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
    return next(e)
  })

  // /know prints the same facts as text and brings the band back if hidden.
  on('command.run', { command: 'know' }, async $ => {
    await update($, isHidden, () => false)
    const text = lines(await read($, edited), await read($, lastTurn), await read($, lastFailed), await read($, claudeMdLines))
    return { text: text.length ? text.join('\n') : 'Nothing to report yet.' }
  })

  // Count tool calls per turn; note files edited and commands that failed.
  on('prompt.submit', ($, e, next) => {
    tools = 0
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    tools += 1
    const ran = await next(e)
    const ok = ran.deny === undefined && ran.isError !== true
    if ((e.tool === 'Edit' || e.tool === 'Write') && ok) {
      await update($, edited, list => (list.includes(e.file_path) ? list : [...list, e.file_path]))
    }
    if (e.tool === 'Bash') {
      if (ok && /\bgit\s+commit\b/.test(e.command)) await update($, edited, () => [])
      await update($, lastFailed, () => (ok ? null : e.command.slice(0, 60)))
    }
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    await update($, lastTurn, () => ({ seconds: Math.round(e.durationMs / 1000), tools }))
    return next(e)
  })

  // The band: one dim line per fact, and a Hide button.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const text = lines(await read($, edited), await read($, lastTurn), await read($, lastFailed), await read($, claudeMdLines))
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
