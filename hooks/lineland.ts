// Lineland, after the desktop pet of A Visitor from the Fourth Dimension: one line of paper that
// this session unfolds. Reads pool into water, commands push up mountains, edits grow trees,
// errors tear rifts. The character (hooks/sprite.ts, a cat by default) walks it; the band's left
// half draws it.

import type { Cell, Pose, Scene } from '../types'
import { SPRITE_SIZE, SPRITES } from './sprite'

export const FPS = 8
const W = 200, H = 48, G0 = 40, CELL = 8      // view in art pixels, ground line, one cell's width
const SPEED = 18                               // art px per second
const SLEEPY_S = 120                           // seconds without session activity before it curls up
const COL: Record<Cell, string> = {
  grass: '#80ae5c', sand: '#e2d09c', water: '#528cbe', rock: '#9c9486', peak: '#746e66', forest: '#60944c', rift: '#2c223a',
}
// per-pose frame time: the export's 100ms breathes too fast at rest
const MS: Record<string, number> = { idle_front: 600, idle_back: 600, sleep_front: 900, sleep_back: 900 }

const GROW: Record<string, [Cell[], string]> = {
  read: [['water', 'water'], '看过的地方积成了水。'],
  run: [['rock', 'peak', 'rock'], '线上推起了一座山。'],
  edit: [['forest', 'forest'], '改写过的地方长出了树。'],
  error: [['rift'], '出错了。线被划破了一道。'],
  other: [['sand'], '线上落了一层沙。'],
}
const kindOf = (tool: string, isBad: boolean) =>
  isBad ? 'error'
  : /^(Read|Grep|Glob|LS|WebFetch|WebSearch|NotebookRead)$/.test(tool) ? 'read'
  : /^(Bash|PowerShell)$/.test(tool) ? 'run'
  : /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool) ? 'edit'
  : 'other'

// the sim is the module's own; a reload starts it over from the stored line
const sim = {
  cells: [] as Cell[], t: 0, x: 12, dir: 1, target: 12, rest: 0, anim: 0,
  said: '', sayT: 0, lastEvent: 0, saidKind: {} as Record<string, number>,
}

export const cells = () => sim.cells
export function load(stored: readonly Cell[]) {
  sim.cells = stored.length ? [...stored] : Array<Cell>(6).fill('grass')
}

// a tool call grows the line where it ends and sends the cat there
export function grow(tool: string, isBad: boolean) {
  const kind = kindOf(tool, isBad)
  const [add, words] = GROW[kind]!
  sim.cells.push(...add)
  sim.lastEvent = sim.t
  sim.target = sim.cells.length * CELL - 4
  sim.rest = 0
  if (sim.t - (sim.saidKind[kind] ?? -99) > 60) {
    sim.saidKind[kind] = sim.t
    sim.said = words
    sim.sayT = 10
  }
}
export const wake = () => { sim.lastEvent = sim.t }

const lift = (c?: Cell) => (c === 'peak' ? 14 : c === 'rock' ? 5 : c === 'water' ? -2 : 0)
const ground = (x: number) => {
  const u = x / CELL - 0.5, i = Math.floor(u), f = u - i
  return lift(sim.cells[i]) * (1 - f) + lift(sim.cells[i + 1]) * f
}
// nothing to stand on over a rift: hop across it
const standY = (x: number) => {
  const hop = sim.cells[Math.floor(x / CELL)] === 'rift' ? Math.sin((Math.PI * (((x % CELL) + CELL) % CELL)) / CELL) * 8 : 0
  return G0 - ground(x) - hop
}

// one frame; true when the cat walked into the blank and unfolded a cell
export function tick(dt: number): boolean {
  sim.t += dt
  const end = sim.cells.length * CELL
  const isSleepy = sim.t - sim.lastEvent > SLEEPY_S

  if (sim.rest > 0) sim.rest -= dt
  else if (Math.abs(sim.target - sim.x) < 0.5) {
    sim.rest = 2 + Math.random() * 4
    // ponytail: wandering is a coin flip; give it moods if it starts to feel repetitive
    if (!isSleepy) sim.target = Math.random() < 0.4 ? end + CELL / 2 : Math.max(8, sim.x - 16 - Math.random() * 64)
  }

  const d = sim.target - sim.x
  if (sim.rest <= 0 && Math.abs(d) >= 0.5) {
    sim.dir = Math.sign(d)
    sim.x += sim.dir * Math.min(Math.abs(d), (SPEED + Math.max(0, Math.abs(d) - 40) * 0.5) * dt)
  }
  sim.anim += dt
  if ((sim.sayT -= dt) <= 0) sim.said = ''

  if (sim.x > end - 2 && sim.cells.length < 5000) {
    sim.cells.push('grass')
    return true
  }
  return false
}

// a sprite may ship only some poses; idle_front is the one every sprite must have
const has = (pose: string) => (SPRITES[pose] ? pose : 'idle_front')

// what to draw this frame; `turnPose` is the pose the running turn asks for while standing still
export function scene(turnPose: Pose | null): Scene {
  const end = sim.cells.length * CELL
  const isMoving = sim.rest <= 0 && Math.abs(sim.target - sim.x) >= 0.5
  const isSleepy = sim.t - sim.lastEvent > SLEEPY_S
  // a side-walk tag (walk_side, drawn facing right) is mirrored for leftward steps; front walk otherwise
  const pose = has(isMoving ? (SPRITES.walk_side ? 'walk_side' : 'walk_front') : turnPose ?? (isSleepy ? 'sleep_front' : 'idle_front'))
  const n = SPRITES[pose]!.frames.length
  return {
    camX: Math.round(Math.min(Math.max(-8, sim.x - W * 0.55), Math.max(-8, end + 24 - W))),
    catX: Math.round(sim.x),
    catY: Math.round(standY(sim.x)),
    pose,
    frame: Math.floor((sim.anim * 1000) / (MS[pose] ?? SPRITES[pose]!.ms)) % n,
    isFlipped: pose === 'walk_side' && sim.dir < 0,
    said: sim.said,
  }
}

export function draw(v: Scene): string {
  const cells = sim.cells
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="72" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">`]
  const r = (x: number, y: number, w: number, h: number, c: string) =>
    o.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`)
  const i0 = Math.max(0, Math.floor(v.camX / CELL)), i1 = Math.min(cells.length, Math.ceil((v.camX + W) / CELL) + 1)

  for (let i = i0; i < i1; i++) {
    if (cells[i] !== 'forest') continue
    const sx = i * CELL - v.camX
    r(sx + 3, G0 - 3, 2, 3, '#70523a')
    r(sx + 1, G0 - 9, 6, 6, '#3a6838')
  }
  for (let x = Math.max(0, Math.floor(v.camX / 2) * 2); x < Math.min(v.camX + W, cells.length * CELL); x += 2) {
    const g = ground(x + 1)
    if (g <= 0.5) continue
    const top = Math.round(G0 - g)
    r(x - v.camX, top, 2, G0 - top, g > 9 ? COL.peak : COL.rock)
    if (g > 10) r(x - v.camX, top, 2, 2, '#d6e2f0')
  }
  for (let i = i0; i < i1; i++) {
    const c = cells[i]!, sx = i * CELL - v.camX
    if (c === 'water') { r(sx, G0, CELL, 3, COL.water); r(sx + ((i * 3) % 5), G0, 2, 1, '#7ab4dc') }
    else if (c === 'rift') { r(sx, G0, CELL, 6, COL.rift); r(sx + 2, G0 + 2, 1, 1, '#966edc'); r(sx + 5, G0 + 4, 1, 1, '#966edc') }
    else r(sx, G0, CELL, 2, c === 'rock' || c === 'peak' ? '#8a8276' : COL[c])
  }

  // the character: its frame box centred on catX, feet on the line
  const half = SPRITE_SIZE / 2, x = v.catX - v.camX
  const at = v.isFlipped ? `translate(${x + half},${v.catY - SPRITE_SIZE}) scale(-1,1)` : `translate(${x - half},${v.catY - SPRITE_SIZE})`
  o.push(`<g transform="${at}">${SPRITES[v.pose]!.frames[v.frame]}</g>`)

  o.push('</svg>')
  return o.join('')
}
