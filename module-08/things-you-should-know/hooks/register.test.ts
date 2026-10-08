import { test, expect } from 'claude-code/testing'
import type { On } from 'claude-code'

const bashOk = { result: { stdout: '', stderr: '', interrupted: false }, text: '', isError: false }
const bashFail = { result: { stdout: '', stderr: 'No such file', interrupted: false }, text: 'No such file', isError: true }
const editOk = (file_path: string) => ({
  result: { filePath: file_path, oldString: 'a', newString: 'b', originalFile: null, structuredPatch: [], userModified: false, replaceAll: false },
  text: 'edited', isError: false,
})

// The test cannot read $.state directly; it watches the writes instead.
function watchState(on: On) {
  const seen: Record<string, unknown> = {}
  on('state.set', ($, e, next) => { seen[e.key] = e.value; return next(e) })
  return seen
}

test('counts files edited since the last commit, once each, and resets on git commit', async ($, on) => {
  const seen = watchState(on)
  on('tool.call', ($, e) => (e.tool === 'Bash' ? bashOk : editOk(String((e as { file_path?: string }).file_path))))
  await $.tool.call({ tool: 'Edit', file_path: '/r/data/trip_metrics.R', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Edit', file_path: '/r/data/trip_metrics.R', old_string: 'b', new_string: 'c' })
  await $.tool.call({ tool: 'Write', file_path: '/r/README.md', content: 'x' })
  expect(seen.edited).toEqual(['/r/data/trip_metrics.R', '/r/README.md'])
  await $.tool.call({ tool: 'Bash', command: 'git commit -m "done"' })
  expect(seen.edited).toEqual([])
})

test('also resets on git -C <dir> commit and on add && commit', async ($, on) => {
  const seen = watchState(on)
  on('tool.call', ($, e) => (e.tool === 'Bash' ? bashOk : editOk(String((e as { file_path?: string }).file_path))))
  await $.tool.call({ tool: 'Write', file_path: '/r/README.md', content: 'x' })
  await $.tool.call({ tool: 'Bash', command: "git -C /r commit -F - <<'EOF'\nmsg\nEOF" })
  expect(seen.edited).toEqual([])
  await $.tool.call({ tool: 'Write', file_path: '/r/README.md', content: 'y' })
  await $.tool.call({ tool: 'Bash', command: 'git add README.md && git commit -m "x"' })
  expect(seen.edited).toEqual([])
})

test('does not reset on git commands that are not commits', async ($, on) => {
  const seen = watchState(on)
  on('tool.call', ($, e) => (e.tool === 'Bash' ? bashOk : editOk(String((e as { file_path?: string }).file_path))))
  await $.tool.call({ tool: 'Write', file_path: '/r/README.md', content: 'x' })
  await $.tool.call({ tool: 'Bash', command: 'git log --oneline -3' })
  await $.tool.call({ tool: 'Bash', command: 'git status --short | grep commit' })
  await $.tool.call({ tool: 'Bash', command: 'git commit-tree abc123 -m x' })
  expect(seen.edited).toEqual(['/r/README.md'])
})

test('remembers the last failed command and forgets it after a success', async ($, on) => {
  const seen = watchState(on)
  on('tool.call', ($, e) => ((e as { command?: string }).command?.includes('nonexistent') ? bashFail : bashOk))
  await $.tool.call({ tool: 'Bash', command: 'ls /nonexistent' })
  expect(seen.lastFailed).toBe('ls /nonexistent')
  await $.tool.call({ tool: 'Bash', command: 'ls data' })
  expect(seen.lastFailed).toBeNull()
})

test('/know prints the facts as text', async ($, on) => {
  on('tool.call', () => bashFail)
  await $.tool.call({ tool: 'Bash', command: 'ls /nonexistent' })
  const { text } = await $.command.run({
    command: 'know', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 },
  })
  expect(text).toContain('last failed command: ls /nonexistent')
})
