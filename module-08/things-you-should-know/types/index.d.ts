export type Turn = { seconds: number; tools: number }

declare module 'claude-code' {
  interface PluginState {
    'things-you-should-know': {
      changed: string[]
      lastTurn: Turn | null
      lastFailed: string | null
      claudeMdLines: number | null
      isHidden: boolean
    }
  }
}
