export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Meter = { limits: Limit[]; ctx?: number }
export type Run = { startedAt: number; seconds: number; tokens: number }

// Lineland: one cell of the line, 8 art pixels wide
export type Cell = 'grass' | 'sand' | 'water' | 'rock' | 'peak' | 'forest' | 'rift'
// what Claude Code is doing, as the character wears it over its head
export type Status =
  | 'idle' | 'prompt' | 'requesting' | 'thinking' | 'responding' | 'preparing'
  | 'tool' | 'permission' | 'error' | 'denied' | 'interrupted' | 'compact'
// what one Lineland frame draws; the sim itself lives in hooks/lineland.ts
export type Scene = {
  t: number
  camX: number
  catX: number
  catY: number
  pose: string
  frame: number
  isFlipped: boolean
  status: Status
  tool: string
  isAsleep: boolean
  label: string
  said: string
  theme: string
}

declare module 'claude-code' {
  interface PluginState {
    'nier-ui': { meter: Meter | null; open: string[]; run: Run; line: Cell[]; scene: Scene | null; theme: string | null }
  }
}
