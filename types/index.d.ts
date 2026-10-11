export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Meter = { limits: Limit[]; ctx?: number }
export type Run = { startedAt: number; seconds: number; tokens: number }
// the language the mod's own words are drawn in
export type Lang = 'zh' | 'ja' | 'en'

// Lineland: one cell of the line, 8 art pixels wide
export type Cell = 'grass' | 'sand' | 'water' | 'rock' | 'peak' | 'forest' | 'rift'
// a wonder standing on the line at cell i (hooks/wonders.ts): the stele, a command's or a file's
// monument, a milestone, or a bridge over an error's rift
export type Mark = { i: number; kind: string; label?: string; n?: number; shape?: string; tool?: string }
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
    linecat: { meter: Meter | null; open: string[]; run: Run; line: Cell[]; scene: Scene | null; theme: string | null; lang: Lang | null; marks: Mark[] }
  }
}
