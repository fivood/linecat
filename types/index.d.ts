export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Meter = { limits: Limit[]; ctx?: number }
export type Run = { startedAt: number; seconds: number; tokens: number }
export type Pose = 'idle_front' | 'idle_back' | 'walk_front' | 'walk_back'

// Lineland: one cell of the line, 8 art pixels wide
export type Cell = 'grass' | 'sand' | 'water' | 'rock' | 'peak' | 'forest' | 'rift'
// what one Lineland frame draws; the sim itself lives in hooks/lineland.ts
export type Scene = {
  camX: number
  catX: number
  catY: number
  pose: string
  frame: number
  isFlipped: boolean
  said: string
}

declare module 'claude-code' {
  interface PluginState {
    'nier-ui': { meter: Meter | null; open: string[]; run: Run; line: Cell[]; scene: Scene | null }
  }
}
