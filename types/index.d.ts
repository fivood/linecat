export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Meter = { limits: Limit[]; ctx?: number }
export type Run = { startedAt: number; seconds: number; tokens: number }
export type Pose = 'idle_front' | 'idle_back' | 'walk_front' | 'walk_back'

declare module 'claude-code' {
  interface PluginState {
    'nier-ui': { meter: Meter | null; pose: Pose; open: string[]; run: Run }
  }
}
