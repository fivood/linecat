// Lineland, after the desktop pet of A Visitor from the Fourth Dimension: one line of paper that
// this session unfolds. Reads pool into water, commands raise mountains, edits grow woods, errors
// tear rifts; the line itself stays flat, and its mountains and woods stand in the vista behind it
// on the sheets that have relief. The character (hooks/sprite.ts, a cat by default) walks it and wears what
// Claude Code is doing over its head; the band's left half draws it. The sheet is one of the
// game's ten (hooks/themes.ts), picked per session.

import type { Cell, Mark, Scene, Status } from '../types'
import { SPRITE_SIZE, SPRITES } from './sprite'
import { tr, W as WORDS, type Words } from './i18n'
import { EVENTS, FOLK, themeOf, type Draw } from './themes'
import { commandKind, drawMark, fileShape, lineOf, MILES, profileOf } from './wonders'

export const FPS = 8
const W = 200, H = 56, G0 = 48, CELL = 8      // view in art pixels, ground line, one cell's width
const SPEED = 18                               // art px per second
const SLEEPY_S = 120                           // seconds without session activity before it curls up
const PAPER = '#fbfaf7', INK = '#4e4b42', AMBER = '#c8901e', RED = '#b2533e'
// the sheets with relief, and the vista's layers: which stretch of the line each shows (in cells),
// its parallax, and its opacity (a hex alpha, so the haze works on a light band and a dark one alike)
const VISTA = new Set(['earth', 'dune', 'solaris', 'ink'])
const VLAYERS = [[23, 0.25, '38'], [9, 0.45, '60'], [0, 0.7, '99']] as const
// per-pose frame time: the export's 100ms breathes too fast at rest
const MS: Record<string, number> = { idle_front: 600, idle_back: 600, sleep_front: 900, sleep_back: 900 }

// what kind of land a tool grows (its shapes are SHAPES, below)
type Kind = keyof typeof WORDS.grow
const kindOf = (tool: string): Kind =>
  /^(Read|Grep|Glob|LS|WebFetch|WebSearch|NotebookRead)$/.test(tool) ? 'read'
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
// the module's own; a reload starts it over from the stored line and marks
const sim = {
  cells: [] as Cell[], marks: [] as Mark[], t: 0, x: 12, dir: 1, target: 12, rest: 0, anim: 0,
  said: null as Words | null, sayT: 0, lastEvent: 0, saidKind: {} as Record<string, number>, theme: 'earth',
  // how often each command kind and each file came up; errors whose rift has no bridge yet
  cmds: new Map<string, number>(), files: new Map<string, number>(), rifts: [] as { i: number; tool: string }[],
  // the residents, and the sheet's next event
  folk: [] as { x: number; dir: number; rest: number }[],
  evt: { start: 0, until: 0, next: 60 },
  // when each mark last spoke, so walking past it again soon stays quiet
  heard: {} as Record<string, number>,
  // at each wonder the character decides on a whim whether to climb it or walk across in front;
  // climb is how high it stands now, easing toward the wonder's top or back to the line
  whim: { key: '', up: false }, climb: 0,
}

export const cells = () => sim.cells
export const marks = () => sim.marks
export function load(stored: readonly Cell[], theme: string, storedMarks: readonly Mark[] = []) {
  sim.cells = stored.length ? [...stored] : Array<Cell>(6).fill('grass')
  sim.marks = storedMarks.map(m => ({ ...m }))
  sim.theme = theme
  const end = sim.cells.length * CELL
  sim.folk = Array.from({ length: 3 }, (_, k) => ({ x: 16 + Math.random() * Math.max(8, end - 32), dir: k % 2 ? 1 : -1, rest: Math.random() * 4 }))
  sim.evt = { start: 0, until: 0, next: sim.t + 40 + Math.random() * 60 }
}
// redraw the same line on another sheet
export const setTheme = (id: string) => { sim.theme = id }
export const themeId = () => sim.theme
// kept in every language and translated when drawn, so a language settled later still applies
export function say(words: Words) {
  sim.said = words
  sim.sayT = 10
}
// a mark's words with its label and count filled in, in every language
function sayMark(m: Mark) {
  const w = lineOf(m)
  const fill = (s: string) => s.replace('{label}', m.label ?? '').replace('{n}', String(m.n ?? 1))
  say({ zh: fill(w.zh), ja: fill(w.ja), en: fill(w.en) })
  sim.heard[m.kind + m.i] = sim.t
}
// the first thing the person says, carved into a stele where the character fell in (cell 2 of the
// six it starts on); one per line
export function stele(text: string) {
  if (sim.marks.some(m => m.kind === 'stele')) return false
  const line = text.replace(/\s+/g, ' ').trim()
  const label = line.length > 24 ? line.slice(0, 23) + '…' : line
  const mark: Mark = { i: 2, kind: 'stele', label }
  sim.marks.push(mark)
  sayMark(mark)
  return true
}
// three flat cells with a wonder standing in the middle one
function raise(m: Omit<Mark, 'i'>) {
  sim.cells.push('grass', 'grass', 'grass')
  const mark: Mark = { ...m, i: sim.cells.length - 2 }
  sim.marks.push(mark)
  sayMark(mark)
}
function milestones() {
  for (const n of MILES) {
    if (sim.cells.length >= n && !sim.marks.some(m => m.kind === 'mile' && m.n === n)) raise({ kind: 'mile', n })
  }
}

// the land a call grows, in one of a few sizes so no two stretches look alike
function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]!
}
const SHAPES: Record<Kind, Cell[][]> = {
  read: [['water'], ['water', 'water'], ['water', 'water', 'water']],
  run: [['rock', 'peak', 'rock'], ['rock', 'peak', 'peak', 'rock'], ['rock', 'rock', 'peak', 'rock'], ['peak', 'rock']],
  edit: [['forest'], ['forest', 'forest'], ['grass', 'forest', 'forest', 'forest']],
  error: [['rift']],
  other: [['sand'], ['sand', 'grass']],
}

// a tool call starting: the line grows where it ends, the character heads there, and a command or
// a file that keeps coming up raises its wonder
export function grow(tool: string, input?: unknown) {
  const kind = kindOf(tool)
  sim.cells.push(...pick(SHAPES[kind]))
  sim.lastEvent = sim.t
  sim.target = sim.cells.length * CELL - 4
  sim.rest = 0
  if (sim.t - (sim.saidKind[kind] ?? -99) > 60) {
    sim.saidKind[kind] = sim.t
    say(WORDS.grow[kind])
  }
  const i = (input ?? {}) as Record<string, unknown>
  if (/^(Bash|PowerShell)$/.test(tool) && typeof i.command === 'string') {
    const ck = commandKind(i.command)
    if (ck) {
      const n = (sim.cmds.get(ck) ?? 0) + 1
      sim.cmds.set(ck, n)
      const had = sim.marks.find(m => m.kind === ck)
      if (had) had.n = n
      else raise({ kind: ck, n })
    }
  }
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool) && typeof i.file_path === 'string') {
    const name = i.file_path.split(/[\\/]/).pop() || i.file_path
    const n = (sim.files.get(name) ?? 0) + 1
    sim.files.set(name, n)
    const had = sim.marks.find(m => m.kind === 'file' && m.label === name)
    if (had) had.n = n
    else if (n >= 3) raise({ kind: 'file', label: name, shape: fileShape(name), n })
  }
  milestones()
}

// a tool call ending: a failure tears a rift; the same tool working again bridges its last open one
export function done(tool: string, isBad: boolean) {
  if (isBad) {
    sim.cells.push('rift')
    sim.rifts.push({ i: sim.cells.length - 1, tool })
    if (sim.t - (sim.saidKind.error ?? -99) > 60) {
      sim.saidKind.error = sim.t
      say(WORDS.grow.error)
    }
    return
  }
  const k = sim.rifts.map(r => r.tool).lastIndexOf(tool)
  if (k < 0) return
  const [rift] = sim.rifts.splice(k, 1)
  const mark: Mark = { i: rift!.i, kind: 'bridge' }
  sim.marks.push(mark)
  sayMark(mark)
}

// The line is one row of the sheet, so it is flat: its cells differ in colour, not in height. Height
// exists only where something three-dimensional stands on it (a wonder, which the character may climb)
// and below it, in a rift's pit. Mountains and woods belong to the rows behind the line: the vista.
// (The game's pet works the same way: web/js/pet.js groundAt, drawVista.)

// how high a cell's land would stand, for the vista: mountains and rocks vary from cell to cell but
// always the same for the same cell
const vary = (i: number, n: number) => ((i * 7919 + 13) % 17) % (n + 1)
const vistaLift = (c: Cell | undefined, i: number) =>
  c === 'peak' ? 0.62 + vary(i, 6) * 0.03 : c === 'rock' ? 0.38 + vary(i, 3) * 0.03 : c === 'forest' ? 0.16 : 0

const isBridged = (i: number) => sim.marks.some(m => m.kind === 'bridge' && m.i === i)
// the wonder the character stands at, if any, and how high its top is under x (the higher of its two
// feet, as the game's footing does)
const CLIMB_MAX = 20
function wonderAt(x: number) {
  for (const m of sim.marks) {
    if (m.kind === 'bridge') continue
    const p = profileOf(m), dx = Math.round(x - (m.i * CELL + 4))
    if (p.has(dx) || p.has(dx - 2) || p.has(dx + 2)) return { m, top: Math.max(p.get(dx - 2) ?? 0, p.get(dx) ?? 0, p.get(dx + 2) ?? 0) }
  }
  return null
}
// hops: over an unbridged rift, and over a resident in the way (in one dimension there is no way round)
const hopAt = (x: number) => {
  const i = Math.floor(x / CELL)
  let hop = sim.cells[i] === 'rift' ? (isBridged(i) ? 2 : Math.sin((Math.PI * (((x % CELL) + CELL) % CELL)) / CELL) * 8) : 0
  for (const f of sim.folk) {
    const d = Math.abs(f.x - x)
    if (d < 6) hop = Math.max(hop, Math.cos((d / 6) * (Math.PI / 2)) * 7)
  }
  return hop
}
const standY = (x: number) => G0 - sim.climb - hopAt(x)
const maxTop = (m: Mark) => Math.max(0, ...profileOf(m).values())

// one frame; true when the line or its marks changed
export function tick(dt: number): boolean {
  sim.t += dt
  const end = sim.cells.length * CELL
  const isSleepy = sim.t - sim.lastEvent > SLEEPY_S && st.base === 'idle'
  let isChanged = false
  const here = Math.floor(sim.x / CELL)

  if (sim.rest > 0) sim.rest -= dt
  else if (Math.abs(sim.target - sim.x) < 0.5 && sim.cells[here] === 'rift' && !isBridged(here)) {
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

  // a wonder underfoot: climb it or walk across, the cat's call, made once as it gets there
  const at = wonderAt(sim.x)
  const key = at ? at.m.kind + at.m.i : ''
  if (key !== sim.whim.key) sim.whim = { key, up: !!at && maxTop(at.m) <= CLIMB_MAX && Math.random() < 0.5 }
  const want = at && sim.whim.up ? at.top : 0
  sim.climb += Math.max(-dt * 40, Math.min(dt * 40, want - sim.climb))

  // the residents amble about, turning at the ends, at water and at rifts. The line grows away from
  // where they started, so one left far behind the character turns up again somewhere near it
  for (const f of sim.folk) {
    if (Math.abs(f.x - sim.x) > 180 && Math.random() < dt * 0.2) {
      const nx = Math.min(end - 10, Math.max(10, sim.x + (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 60)))
      const c = sim.cells[Math.floor(nx / CELL)]
      if (c !== 'rift' && c !== 'water') f.x = nx
    }
    if (f.rest > 0) {
      f.rest -= dt
      continue
    }
    const nx = f.x + f.dir * 5 * dt, c = sim.cells[Math.floor(nx / CELL)]
    if (nx < 8 || nx > end - 8 || c === 'rift' || c === 'water') f.dir = -f.dir
    else f.x = nx
    if (Math.random() < dt * 0.15) f.rest = 1 + Math.random() * 4
  }

  // a wonder speaks up when the character walks up to it, once every few minutes
  if (!sim.said) {
    for (const m of sim.marks) {
      if (Math.abs(sim.x - (m.i * CELL + 4)) < 4 && sim.t - (sim.heard[m.kind + m.i] ?? -999) > 180) {
        sayMark(m)
        break
      }
    }
  }

  // the sheet's own event every minute or two, asleep or not; it is narrated only to someone around
  const ev = EVENTS[sim.theme]
  if (ev && sim.t >= sim.evt.next) {
    sim.evt = { start: sim.t, until: sim.t + ev.seconds, next: sim.t + ev.seconds + 60 + Math.random() * 90 }
    if (!sim.said && !isSleepy) say(ev.words)
  }

  if (sim.x > end - 2 && sim.cells.length < 5000) {
    sim.cells.push('grass')
    milestones()
    isChanged = true
  }
  return isChanged
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

// marks drawn straight over the head, with no frame: each first gets a one-pixel paper halo, so it
// reads on a light band and on a dark one alike
function haloed(r: Draw, paint: (m: Draw) => void) {
  const marks: [number, number, number, number, string][] = []
  paint((x, y, w, h, c) => marks.push([x, y, w, h, c]))
  for (const [x, y, w, h] of marks) r(x - 1, y - 1, w + 2, h + 2, PAPER)
  for (const [x, y, w, h, c] of marks) r(x, y, w, h, c)
}

function overhead(r: Draw, v: Scene, cx: number) {
  const t = v.t
  // a 7x7 mark a few pixels above the ears (the head reaches about 18px up the sprite's box)
  const x = Math.round(cx - 3), y = Math.max(2, v.catY - SPRITE_SIZE - 5)
  if (v.isAsleep) {
    // z's drifting up and away from the sleeper, starting clear of its head
    return haloed(r, m => {
      for (let k = 0; k < 3; k++) {
        const p = (t / 2 + k / 3) % 1, zx = Math.round(cx + 6 + p * 8), zy = Math.round(v.catY - 18 - p * 16)
        if (zy > 1) bitmap(m, ['###', '.#.', '###'], zx, zy, INK)
      }
    })
  }
  const icon = (name: string, c = INK) => (m: Draw) => bitmap(m, ICONS[name]!, x, y, c)
  const paint = ((): ((m: Draw) => void) | null => {
    switch (v.status) {
      case 'idle': return null
      case 'prompt': return icon('bang')
      // signal bars filling up
      case 'requesting': return m => {
        const n = 1 + (Math.floor(t * 3) % 4)
        for (let k = 0; k < n; k++) m(x + k * 2, y + 6 - k * 2, 1, k * 2 + 1, INK)
      }
      // three dots lighting one after another
      case 'thinking': return m => {
        const n = Math.floor(t * 3) % 4
        for (let k = 0; k < 3; k++) m(x - 1 + k * 3, y + 3, 2, 2, k < n ? INK : '#a8a292')
      }
      // lines typing themselves out
      case 'responding': return m => {
        for (let k = 0; k < 3; k++) {
          const len = Math.min(7, Math.max(0, Math.floor(t * 8 - k * 4) % 12))
          if (len) m(x, y + 1 + k * 2, len, 1, INK)
        }
      }
      case 'preparing': return icon(v.tool ? iconOfTool(v.tool) : 'gear', Math.floor(t * 4) % 2 ? INK : '#8a8676')
      case 'tool': return icon(iconOfTool(v.tool), v.tool === 'AskUserQuestion' ? AMBER : INK)
      case 'permission': return icon('ask', Math.floor(t * 2) % 2 ? AMBER : '#e0b450')
      case 'error': return icon('bang', RED)
      case 'denied': return icon('cross', RED)
      case 'interrupted': return icon('stop')
      case 'compact': return icon(Math.floor(t) % 2 ? 'glassB' : 'glassA')
    }
  })()
  if (paint) haloed(r, paint)
}

// --- drawing ---------------------------------------------------------------------------------
// a view `viewW` art pixels wide: the band's is W; a pane passes its own shape's, so a wide pane shows
// more of the line at the same scale instead of a zoomed crop
export function draw(scene: Scene, viewW = W): string {
  const end0 = sim.cells.length * CELL
  // the camera for this width: the character a little left of centre, the line's end kept in view
  const v = viewW === W ? scene : { ...scene, camX: Math.round(Math.min(Math.max(-8, scene.catX - viewW * 0.55), Math.max(-8, end0 + 24 - viewW))) }
  const th = themeOf(v.theme)
  const cells = sim.cells
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" width="${viewW * 1.5}" height="${H * 1.5}" viewBox="0 0 ${viewW} ${H}" shape-rendering="crispEdges">`]
  const r: Draw = (x, y, w, h, c) => {
    if (w > 0 && h > 0) o.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`)
  }
  const i0 = Math.max(0, Math.floor(v.camX / CELL)), i1 = Math.min(cells.length, Math.ceil((v.camX + viewW) / CELL) + 1)

  if (th.bg) r(0, 0, viewW, H, th.bg)
  th.decor?.(r, v.t, v.camX, viewW, H, G0)

  // the vista: the rows of the sheet behind the line, three layers deep, farther ones paler and slower.
  // Only sheets with relief have one (the game's VISTA: Earthlike, Dune, Solaris, Ink Wash); on a flat
  // sheet (a slide, a board, a plan, the foil, the sky) nothing stands behind a line through it.
  // Each layer reads the session's own land at its own offset, so a command's mountain rises behind
  // the stretch of line it grew.
  if (VISTA.has(th.id)) {
    for (const [off, p, alpha] of VLAYERS) {
      for (let sx = 0; sx < viewW; sx += 2) {
        const wx = sx + v.camX * p, u = wx / CELL + off, ci = Math.floor(u), f = u - ci
        const hAt = (i: number) => {
          let h = 0
          for (let d = -3; d <= 3; d++) h += vistaLift(cells[i + d], i + d) * (1 - Math.abs(d) / 4)
          return h / 3.4
        }
        let hh = hAt(ci) * (1 - f) + hAt(ci + 1) * f
        if (hh < 0.04) continue
        // summits: heights rise and fall a little along the layer, in proportion, so a run of
        // mountains comes to points instead of one plateau, and low ground stays low
        hh *= 1 + ((1 - Math.abs(((wx / (13 + off)) % 1) * 2 - 1)) - 0.5) * 0.4
        const isWood = cells[ci] === 'forest' && hh < 0.3
        if (isWood) hh += (1 - Math.abs(((wx / 3) % 1) * 2 - 1)) * 0.07            // treetops, one point each
        const hp = Math.round(hh ** 0.8 * (14 + 22 * p))
        // in bands, not columns: woods or rock below, the peak colour on a mountain's upper part, snow on top
        r(sx, G0 - hp, 2, hp, (isWood ? th.tree[0] : th.rock) + alpha)
        if (hh > 0.42) r(sx, G0 - hp, 2, Math.round(hp * Math.min(0.6, (hh - 0.42) * 2.5)), th.peak + alpha)
        if (hh > 0.6) r(sx, G0 - hp, 2, Math.max(1, Math.round(hp * 0.15)), th.cap + alpha)
      }
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

  // the sheet's event, while it lasts
  const ev = EVENTS[th.id]
  if (ev && v.t < sim.evt.until) ev.draw(r, Math.min(1, (v.t - sim.evt.start) / ev.seconds), v.t, viewW, H, G0)

  // the wonders, standing on the line
  for (const m of sim.marks) {
    const mx = m.i * CELL + 4 - v.camX
    if (mx < -12 || mx > viewW + 12) continue
    drawMark(r, m, mx, G0, v.t)
  }

  // the residents: short upright strokes, all the line lets them be
  for (const f of sim.folk) {
    const fx = Math.round(f.x - v.camX)
    if (fx < -2 || fx > viewW) continue
    const fy = G0, c = FOLK[th.id] ?? INK
    // a head, a body, and legs that step while walking
    const step = f.rest > 0 ? 0 : Math.floor(v.t * 4 + fx) % 2
    r(fx, fy - 7, 2, 2, c); r(fx, fy - 4, 2, 3, c); r(fx - step, fy - 1, 1, 1, c); r(fx + 1 + step, fy - 1, 1, 1, c)
  }

  // the character: its frame box centred on catX, feet on the line
  const half = SPRITE_SIZE / 2, cx = v.catX - v.camX
  const at = v.isFlipped ? `translate(${cx + half},${v.catY - SPRITE_SIZE}) scale(-1,1)` : `translate(${cx - half},${v.catY - SPRITE_SIZE})`
  o.push(`<g transform="${at}">${SPRITES[v.pose]!.frames[v.frame]}</g>`)

  overhead(r, v, cx)

  o.push('</svg>')
  return o.join('')
}
