import { test, expect } from 'claude-code/testing'
import type { On } from 'claude-code'

const bashOk = { result: { stdout: '', stderr: '', interrupted: false }, text: '', isError: false }
const bashFail = { result: { stdout: '', stderr: 'No such file', interrupted: false }, text: 'No such file', isError: true }
const know = { command: 'know', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

// Stand in for git: answer `git status --porcelain` with whatever the test says.
function fakeGit(on: On, status: { stdout: string; exitCode?: number }) {
  on('process.run', () => ({
    value: {
      exitCode: status.exitCode ?? 0, stdout: status.stdout, stderr: '',
      isStdoutTruncated: false, isStderrTruncated: false,
    },
  }))
}

test('reports every file git says changed, however it was changed', async ($, on) => {
  fakeGit(on, { stdout: ' M data/trip_metrics.R\n?? README.md\n' })
  const { text } = await $.command.run(know)
  expect(text).toContain('2 files changed since the last commit: trip_metrics.R, README.md')
})

test('says nothing about files when git reports a clean tree (after a commit)', async ($, on) => {
  fakeGit(on, { stdout: '' })
  const { text } = await $.command.run(know)
  expect(text).toBe('Nothing to report yet.')
})

test('says nothing about files outside a git repository', async ($, on) => {
  fakeGit(on, { stdout: '', exitCode: 128 })
  const { text } = await $.command.run(know)
  expect(text).toBe('Nothing to report yet.')
})

test('reads the new name of a renamed file', async ($, on) => {
  fakeGit(on, { stdout: 'R  old.R -> data/new_name.R\n' })
  const { text } = await $.command.run(know)
  expect(text).toContain('1 file changed since the last commit: new_name.R')
})

test('remembers the last failed command and forgets it after a success', async ($, on) => {
  fakeGit(on, { stdout: '' })
  on('tool.call', ($, e) => ((e as { command?: string }).command?.includes('missing') ? bashFail : bashOk))
  await $.tool.call({ tool: 'Bash', command: 'ls data/missing.csv' })
  expect((await $.command.run(know)).text).toContain('last failed command: ls data/missing.csv')
  await $.tool.call({ tool: 'Bash', command: 'ls data' })
  expect((await $.command.run(know)).text).toBe('Nothing to report yet.')
})
