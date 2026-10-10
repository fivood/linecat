// Lineland, after the desktop pet of A Visitor from the Fourth Dimension: one line of paper that
// this session unfolds. Reads pool into water, commands push up mountains, edits grow trees,
// errors tear rifts. The character (hooks/sprite.ts, a cat by default) walks it and wears what
// Claude Code is doing over its head; the band's left half draws it. The sheet is one of the
// game's ten (hooks/themes.ts), picked per session.

import type { Cell, Scene, Status } from '../types'
import { SPRITE_SIZE, SPRITES } from './sprite'
import { tr, W as WORDS, type Words } from './i18n'
import { drawTree, themeOf, type Draw } from './themes'

export const FPS = 8
const W = 200, H = 56, G0 = 48, CELL = 8      // view in art pixels, ground line, one cell's width
const SPEED = 18                               // art px per second
const SLEEPY_S = 120                           // seconds without session activity before it curls up
const PAPER = '#fbfaf7', INK = '#4e4b42', AMBER = '#c8901e', RED = '#b2533e'
// per-pose frame time: the export's 100ms breathes too fast at rest
const MS: Record<string, number> = { idle_front: 600, idle_back: 600, sleep_front: 900, sleep_back: 900 }

const GROW: Record<keyof typeof WORDS.grow, Cell[]> = {
  read: ['water', 'water'],
  run: ['rock', 'peak', 'rock'],
  edit: ['forest', 'forest'],
  error: ['rift'],
  other: ['sand'],
}
const kindOf = (tool: string, isBad: boolean): keyof typeof GROW =>
  isBad ? 'error'
  : /^(Read|Grep|Glob|LS|WebFetch|WebSearch|NotebookRead)$/.test(tool) ? 'read'
  : /^(Bash|PowerShell)$/.test(tool) ? 'run'
  : /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool) ? 'edit'
  : 'other'

// --- what Claude Code is doing -------------------------------------------------------------
// `base` holds while it lasts (a turn's phase, a running tool); a flash covers it for a few seconds
// (a prompt arriving, an error, a denial) and then the base shows again.
const st = { base: 'idle' as Status, tool: '', flash: null as Status | null, flashTool: '', until: 0 }

export function setStatus(s: Status, tool = '') {
  st.base = s
  st.tool = tool
  sim.lastEvent = sim.t
}
export function flash(s: Status, tool = '', seconds = 3) {
  st.flash = s
  st.flashTool = tool
  st.until = sim.t + seconds
  sim.lastEvent = sim.t
}
const current = (): [Status, string] => (st.flash && sim.t < st.until ? [st.flash, st.flashTool] : [st.base, st.tool])

const LABEL: Record<Status, string> = {
  idle: 'NO ERROR', prompt: 'INPUT RECEIVED', requesting: 'CONNECTING', thinking: 'ANALYZING',
  responding: 'TRANSMITTING', preparing: 'PREPARING', tool: 'EXECUTE', permission: 'AWAITING AUTHORIZATION',
  error: 'ERROR', denied: 'DENIED', interrupted: 'INTERRUPTED', compact: 'COMPRESSING MEMORY',
}

// --- the sim ---------------------------------------------------------------------------------
// the module's own; a reload starts it over from the stored line
const sim = {
  cells: [] as Cell[], t: 0, x: 12, dir: 1, target: 12, rest: 0, anim: 0,
  said: null as Words | null, sayT: 0, lastEvent: 0, saidKind: {} as Record<string, number>, theme: 'earth',
}

export const cells = () => sim.cells
export function load(stored: readonly Cell[], theme: string) {
  sim.cells = stored.length ? [...stored] : Array<Cell>(6).fill('grass')
  sim.theme = theme
}
// redraw the same line on another sheet
export const setTheme = (id: string) => { sim.theme = id }
// kept in every language and translated when drawn, so a language settled later still applies
export function say(words: Words) {
  sim.said = words
  sim.sayT = 10
}

// a tool call grows the line where it ends and sends the character there
export function grow(tool: string, isBad: boolean) {
  const kind = kindOf(tool, isBad)
  sim.cells.push(...GROW[kind])
  sim.lastEvent = sim.t
  sim.target = sim.cells.length * CELL - 4
  sim.rest = 0
  if (sim.t - (sim.saidKind[kind] ?? -99) > 60) {
    sim.saidKind[kind] = sim.t
    say(WORDS.grow[kind])
  }
}

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

// one frame; true when the character walked into the blank and unfolded a cell
export function tick(dt: number): boolean {
  sim.t += dt
  const end = sim.cells.length * CELL
  const isSleepy = sim.t - sim.lastEvent > SLEEPY_S && st.base === 'idle'

  if (sim.rest > 0) sim.rest -= dt
  else if (Math.abs(sim.target - sim.x) < 0.5 && sim.cells[Math.floor(sim.x / CELL)] === 'rift') {
    // never come to rest mid-hop over a rift: finish crossing it
    sim.target = sim.x + sim.dir * CELL
  } else if (Math.abs(sim.target - sim.x) < 0.5) {
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
  if ((sim.sayT -= dt) <= 0) sim.said = null

  if (sim.x > end - 2 && sim.cells.length < 5000) {
    sim.cells.push('grass')
    return true
  }
  return false
}

// a sprite may ship only some poses; idle_front is the one every sprite must have
const has = (pose: string) => (SPRITES[pose] ? pose : 'idle_front')
// the pose a status asks for while standing still
const STAND: Partial<Record<Status, string>> = {
  thinking: 'idle_back', preparing: 'walk_back', tool: 'walk_back', permission: 'idle_front', responding: 'walk_front',
}

export function scene(): Scene {
  const end = sim.cells.length * CELL
  const isMoving = sim.rest <= 0 && Math.abs(sim.target - sim.x) >= 0.5
  const [status, tool] = current()
  const isAsleep = status === 'idle' && sim.t - sim.lastEvent > SLEEPY_S
  // front poses are drawn facing right and mirrored once the character last walked left
  const pose = has(isMoving ? 'walk_front' : STAND[status] ?? (isAsleep ? 'sleep_front' : 'idle_front'))
  const n = SPRITES[pose]!.frames.length
  return {
    t: Math.round(sim.t * 100) / 100,
    camX: Math.round(Math.min(Math.max(-8, sim.x - W * 0.55), Math.max(-8, end + 24 - W))),
    catX: Math.round(sim.x),
    catY: Math.round(standY(sim.x)),
    pose,
    frame: Math.floor((sim.anim * 1000) / (MS[pose] ?? SPRITES[pose]!.ms)) % n,
    isFlipped: sim.dir < 0 && !pose.endsWith('_back'),
    status,
    tool,
    isAsleep,
    label: isAsleep ? 'SLEEP MODE' : tool ? `${LABEL[status]}: ${tool.replace(/^mcp__([^_]+)__/, '$1/')}` : LABEL[status],
    said: sim.said ? tr(sim.said) : '',
    theme: sim.theme,
  }
}

// --- icons over the character's head: 7x7 bitmaps, '#' inked ---------------------------------
const ICONS: Record<string, string[]> = {
  page: ['######.', '#....##', '#.##..#', '#.....#', '#.###.#', '#.....#', '#######'],
  search: ['.###...', '#...#..', '#...#..', '#...#..', '.###...', '....##.', '.....##'],
  terminal: ['#######', '#.....#', '#.#...#', '#..#..#', '#.#...#', '#...###', '#######'],
  pencil: ['.....##', '....###', '...###.', '..###..', '.###...', '#.#....', '##.....'],
  globe: ['..###..', '.#.#.#.', '#..#..#', '#######', '#..#..#', '.#.#.#.', '..###..'],
  agent: ['###....', '#.#....', '###.###', '....#.#', '###.###', '#.#....', '###....'],
  todo: ['#.#####', '.......', '#.#####', '.......', '#.#####', '.......', '.......'],
  plug: ['.#...#.', '.#...#.', '#######', '#######', '.#####.', '..###..', '...#...'],
  spark: ['...#...', '..###..', '#######', '..###..', '.#...#.', '.......', '.......'],
  gear: ['..#.#..', '.#####.', '##...##', '.#...#.', '##...##', '.#####.', '..#.#..'],
  ask: ['..###..', '.#...#.', '.....#.', '....#..', '...#...', '.......', '...#...'],
  bang: ['...#...', '...#...', '...#...', '...#...', '...#...', '.......', '...#...'],
  cross: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  stop: ['.......', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.', '.......'],
  glassA: ['#######', '.#####.', '..###..', '...#...', '..#.#..', '.#...#.', '#######'],
  glassB: ['#######', '.#...#.', '..#.#..', '...#...', '..###..', '.#####.', '#######'],
}
const iconOfTool = (tool: string) =>
  /^(Read|NotebookRead)$/.test(tool) ? 'page'
  : /^(Grep|Glob|LS|ToolSearch)$/.test(tool) ? 'search'
  : /^(Bash|PowerShell|BashOutput|KillShell|Monitor)$/.test(tool) ? 'terminal'
  : /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool) ? 'pencil'
  : /^(WebFetch|WebSearch)$/.test(tool) ? 'globe'
  : /^(Agent|Task|SendMessage)$/.test(tool) ? 'agent'
  : /^(TodoWrite|Task[A-Z]\w*)$/.test(tool) ? 'todo'
  : tool === 'AskUserQuestion' ? 'ask'
  : tool === 'Skill' ? 'spark'
  : tool.startsWith('mcp__') ? 'plug'
  : 'gear'

function bitmap(r: Draw, rows: string[], x: number, y: number, c: string) {
  rows.forEach((row, j) => {
    for (const m of row.matchAll(/#+/g)) r(x + m.index!, y + j, m[0].length, 1, c)
  })
}

// a speech bubble (tail) or a thought bubble (cut corners, a trail of dots), 11x11, its icon drawn by `fill`
function bubble(r: Draw, x: number, y: number, edge: string, isThought: boolean, fill: (ix: number, iy: number) => void) {
  if (isThought) {
    r(x + 1, y, 9, 11, edge); r(x, y + 1, 11, 9, edge)
    r(x + 2, y + 1, 7, 9, PAPER); r(x + 1, y + 2, 9, 7, PAPER)
    r(x + 3, y + 12, 2, 2, edge); r(x + 1, y + 15, 1, 1, edge)
  } else {
    r(x, y, 11, 11, edge)
    r(x + 1, y + 1, 9, 9, PAPER)
    r(x + 4, y + 11, 3, 1, edge); r(x + 5, y + 12, 1, 1, edge)
  }
  fill(x + 2, y + 2)
}

function overhead(r: Draw, v: Scene, cx: number) {
  const t = v.t
  // the head sits about two thirds up the sprite's box
  const x = Math.round(cx - 5), y = Math.max(1, v.catY - SPRITE_SIZE - 8)
  if (v.isAsleep) {
    // z's drifting up from the sleeper
    for (let k = 0; k < 3; k++) {
      const p = (t / 2 + k / 3) % 1, zx = x + 8 + Math.round(p * 6), zy = Math.round(v.catY - 14 - p * 14)
      if (zy > 0) bitmap(r, ['###', '.#.', '###'], zx, zy, INK)
    }
    return
  }
  const icon = (name: string, c = INK) => (ix: number, iy: number) => bitmap(r, ICONS[name]!, ix, iy, c)
  switch (v.status) {
    case 'idle': return
    case 'prompt': return bubble(r, x, y, INK, false, icon('bang'))
    case 'requesting': return bubble(r, x, y, INK, false, (ix, iy) => {
      // signal bars filling up
      const n = 1 + (Math.floor(t * 3) % 4)
      for (let k = 0; k < n; k++) r(ix + k * 2, iy + 6 - k * 2, 1, k * 2 + 1, INK)
    })
    case 'thinking': return bubble(r, x, y, INK, true, (ix, iy) => {
      // three dots lighting one after another
      const n = Math.floor(t * 3) % 4
      for (let k = 0; k < 3; k++) r(ix + k * 3, iy + 3, 1, 1, k < n ? INK : '#cfcab8')
    })
    case 'responding': return bubble(r, x, y, INK, false, (ix, iy) => {
      // lines typing themselves out
      for (let k = 0; k < 3; k++) {
        const len = Math.min(7, Math.max(0, Math.floor(t * 8 - k * 4) % 12))
        if (len) r(ix, iy + 1 + k * 2, len, 1, INK)
      }
    })
    case 'preparing': return bubble(r, x, y, INK, false, icon(v.tool ? iconOfTool(v.tool) : 'gear', Math.floor(t * 4) % 2 ? INK : '#8a8676'))
    case 'tool': return bubble(r, x, y, INK, false, icon(iconOfTool(v.tool), v.tool === 'AskUserQuestion' ? AMBER : INK))
    case 'permission': return bubble(r, x, y, Math.floor(t * 2) % 2 ? AMBER : INK, false, icon('ask', AMBER))
    case 'error': return bubble(r, x, y, RED, false, icon('bang', RED))
    case 'denied': return bubble(r, x, y, RED, false, icon('cross', RED))
    case 'interrupted': return bubble(r, x, y, INK, false, icon('stop'))
    case 'compact': return bubble(r, x, y, INK, false, icon(Math.floor(t) % 2 ? 'glassB' : 'glassA'))
  }
}

// --- drawing ---------------------------------------------------------------------------------
export function draw(v: Scene): string {
  const th = themeOf(v.theme)
  const cells = sim.cells
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="84" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">`]
  const r: Draw = (x, y, w, h, c) => {
    if (w > 0 && h > 0) o.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`)
  }
  const i0 = Math.max(0, Math.floor(v.camX / CELL)), i1 = Math.min(cells.length, Math.ceil((v.camX + W) / CELL) + 1)

  if (th.bg) r(0, 0, W, H, th.bg)
  th.decor?.(r, v.t, v.camX, W, H, G0)

  for (let i = i0; i < i1; i++) if (cells[i] === 'forest') drawTree(r, th, i * CELL - v.camX, G0, i)

  // mountains, one 2px column at a time, in the sheet's own way
  const end = Math.min(v.camX + W, cells.length * CELL)
  for (let x = Math.max(0, Math.floor(v.camX / 2) * 2); x < end; x += 2) {
    const g = ground(x + 1)
    if (g <= 0.5) continue
    const top = Math.round(G0 - g), sx = x - v.camX, hgt = G0 - top
    switch (th.peakStyle) {
      case 'mount':
        r(sx, top, 2, hgt, g > 9 ? th.peak : th.rock)
        if (g > 10) r(sx, top, 2, 2, th.cap)
        break
      case 'contour':
        r(sx, top, 2, hgt, g > 9 ? th.peak : th.rock)
        for (let yy = G0 - 3; yy > top; yy -= 3) r(sx, yy, 2, 1, th.cap)
        break
      case 'facet':
        r(sx, top, 2, hgt, ground(x + 3) > g ? th.cap : th.peak)
        r(sx, top, 2, 1, '#ffffff')
        break
      case 'chip': {
        const q = Math.round(g / 3) * 3, qt = G0 - q
        r(sx, qt, 2, q, g > 9 ? th.peak : th.rock)
        if ((x / 2) % 2 === 0) r(sx, qt - 1, 1, 1, th.cap)
        break
      }
      case 'column':
        r(sx, top, 2, hgt, (x / 2) % 2 ? th.peak : th.rock)
        r(sx, top, 2, 1, th.cap)
        break
      case 'star':
        if ((x / 2) % 2 === 0) r(sx, top, 1, 1, g > 10 ? th.cap : th.peak)
        break
      case 'wash':
        r(sx, top, 2, hgt, th.peak)
        r(sx, Math.round(G0 - g / 2), 2, Math.round(g / 2), th.rock)
        r(sx, top, 2, 1, th.cap)
        break
    }
  }

  // the line itself
  for (let i = i0; i < i1; i++) {
    const c = cells[i]!, sx = i * CELL - v.camX
    if (c === 'water') {
      r(sx, G0, CELL, 3, th.water[0])
      r(sx + ((i * 3 + Math.floor(v.t * 2)) % 6), G0 + (th.id === 'slide' ? 1 : 0), 2, 1, th.water[1])
    } else if (c === 'rift') {
      r(sx, G0, CELL, 6, th.rift[0])
      r(sx + 2, G0 + 2, 1, 1, th.rift[1]); r(sx + 5, G0 + 4, 1, 1, th.rift[1])
      if (th.id === 'ink') r(sx + 5, G0 - 5, 3, 3, th.rift[1])   // the red seal stamped beside the slip
    } else r(sx, G0, CELL, 2, th.cell[c])
  }

  // the character: its frame box centred on catX, feet on the line
  const half = SPRITE_SIZE / 2, cx = v.catX - v.camX
  const at = v.isFlipped ? `translate(${cx + half},${v.catY - SPRITE_SIZE}) scale(-1,1)` : `translate(${cx - half},${v.catY - SPRITE_SIZE})`
  o.push(`<g transform="${at}">${SPRITES[v.pose]!.frames[v.frame]}</g>`)

  overhead(r, v, cx)

  o.push('</svg>')
  return o.join('')
}
