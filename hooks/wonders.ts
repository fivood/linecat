// Wonders on the line, after A Visitor from the Fourth Dimension (web/js/wonders.js): things that
// grow out of the session and stand beside the road. The game's are 3D voxel models seen from above;
// Lineland sees them from the side, as a profile on the line.
//   stele      the first thing you said, carved where the character fell in
//   deploy, build, test, git, install
//              a launch pad, a forge, a proving ground, a branching tree, a dependency grove: one
//              for each kind of command, the first time it runs (the kinds are the game's CMD_CATS)
//   file       a file edited three times becomes a monument shaped by its extension
//   mile       a milestone post at 50, 100, 250, 500 and 1000 cells
//   bridge     an error's rift gets a bridge once the same tool works again

import type { Mark } from '../types'
import type { Words } from './i18n'
import type { Draw } from './themes'

// the game's command kinds (web/parse.js CMD_CATS), in its order: the first that matches wins
const CMD_CATS: [string, RegExp][] = [
  ['deploy', /\b(deploy|wrangler|vercel|netlify|gh-pages)\b|git\s+push/i],
  ['install', /\b(npm|pnpm|yarn|pip3?|cargo)\s+(install|add|i)\b/i],
  ['test', /\b(test|pytest|jest|vitest|mocha)\b|test\.m?js/i],
  ['build', /\b(build|cargo|tauri|make|tsc|webpack|vite|gradle|mvn)\b/i],
  ['git', /^\s*git\b/i],
]
export const commandKind = (command: string) => CMD_CATS.find(([, re]) => re.test(command))?.[0] ?? null

// the shape a file's monument takes, by extension (the game's model(): tower, gate, terrace, book…)
export function fileShape(file: string) {
  const ext = (file.match(/\.(\w+)$/) ?? [])[1]?.toLowerCase() ?? ''
  if (/^(m?js|jsx|cjs)$/.test(ext)) return 'js'
  if (/^tsx?$/.test(ext)) return 'ts'
  if (/^html?$/.test(ext)) return 'html'
  if (/^(s?css|less)$/.test(ext)) return 'css'
  if (/^(md|txt|rst)$/.test(ext)) return 'md'
  if (ext === 'py') return 'py'
  return 'other'
}

export const MILES = [50, 100, 250, 500, 1000]

// the game's palette for wonders (C3)
const C = {
  stone: '#c4beb4', dark: '#78726e', clay: '#d6805c', gold: '#e2ba5c', white: '#d8d0bc', wood: '#966c46',
  green: '#60964f', brick: '#b06048', js: '#e8cc5c', ts: '#6892d2', html: '#e27850', py: '#569680', ink: '#3c3840',
  smoke: '#a8a29a', fire: '#f2a03c',
}

// 3x5 digits for a milestone's sign
const DIGITS: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'],
  '5': ['###', '#..', '###', '..#', '###'],
}

// a mark's profile, standing with its foot on (x, y): x its middle, y the ground under it
export function drawMark(r: Draw, m: Mark, x: number, y: number, t: number) {
  const px = (dx: number, dy: number, w: number, h: number, c: string) => r(x + dx, y - dy - h, w, h, c)
  switch (m.kind) {
    case 'stele':
      px(-6, 0, 12, 2, C.stone); px(-3, 2, 6, 15, C.stone); px(-3, 17, 6, 2, C.dark)
      for (let k = 0; k < 4; k++) px(-2, 5 + k * 3, 4, 1, C.dark)          // the inscription
      break
    case 'deploy':
      px(-8, 0, 16, 2, C.stone); px(5, 2, 2, 20, C.dark); px(3, 16, 3, 1, C.dark)
      px(-4, 2, 7, 14, C.ink); px(-3, 2, 5, 13, C.white); px(-2, 15, 3, 2, C.clay); px(-1, 17, 1, 1, C.clay)
      px(-4, 2, 1, 3, C.clay); px(2, 2, 1, 3, C.clay)                       // fins
      break
    case 'build': {
      px(-7, 0, 13, 9, C.brick); px(2, 9, 3, 7, C.brick); px(-3, 0, 3, 4, C.ink)
      px(-2, 1, 1, 2, Math.floor(t * 4) % 2 ? C.fire : C.gold)               // the fire inside
      for (let k = 0; k < 3; k++) {                                         // smoke from the chimney
        const p = (t / 3 + k / 3) % 1
        px(3 + Math.round(p * 4), 17 + Math.round(p * 10), 2 - Math.round(p), 2 - Math.round(p), C.smoke)
      }
      break
    }
    case 'test':
      for (let k = 0; k < 5; k++) px(-8 + k * 4, 0, 2, k % 2 ? 7 : 9, C.stone)
      px(-8, 0, 18, 1, C.dark)
      break
    case 'git':
      px(-1, 0, 3, 14, C.wood); px(-6, 8, 5, 2, C.wood); px(2, 10, 5, 2, C.wood)
      px(-8, 9, 3, 5, C.green); px(6, 11, 3, 5, C.green); px(-2, 14, 5, 4, C.green)
      break
    case 'install':
      for (const [dx, h] of [[-8, 4], [-3, 6], [2, 3], [6, 5]] as const) { px(dx + 1, 0, 1, 2, C.wood); px(dx, 2, 3, h, C.green) }
      break
    case 'file': {
      const s = m.shape ?? 'other'
      if (s === 'js' || s === 'ts') {
        const c = s === 'js' ? C.js : C.ts
        px(-7, 0, 14, 6, c); px(-5, 6, 10, 6, c); px(-3, 12, 6, 6, c); px(-1, 18, 2, 2, C.gold)
        for (const [dx, dy] of [[-4, 2], [2, 2], [-2, 8], [1, 8]]) px(dx, dy, 1, 2, C.ink)   // windows
      } else if (s === 'html') {
        px(-8, 0, 4, 15, C.html); px(4, 0, 4, 15, C.html); px(-8, 15, 16, 3, C.clay)
      } else if (s === 'css') {
        px(-8, 0, 16, 2, C.stone)
        for (let k = 0; k < 4; k++) px(-8 + k * 4, 2, 4, 1, [C.clay, C.ts, C.gold, C.clay][k]!)
      } else if (s === 'md') {
        px(-8, 0, 16, 2, C.ink)
        for (let k = 0; k < 7; k++) {
          const h = 2 + Math.round(k * 0.9)
          px(-8 + k, 2, 1, h, C.white); px(7 - k, 2, 1, h, C.white)
          px(-8 + k, 2 + h, 1, 1, C.ink); px(7 - k, 2 + h, 1, 1, C.ink)     // the pages' top edge
        }
        px(-1, 2, 2, 9, C.ink)
      } else if (s === 'py') {
        for (let k = 0; k < 7; k++) px(-9 + k * 3, 0, 3, 4 + (k % 2), C.py)
      } else {
        px(-5, 0, 10, 2, C.stone); px(-3, 2, 6, 20, C.dark); px(-2, 22, 4, 2, C.gold)
      }
      break
    }
    case 'mile': {
      px(0, 0, 1, 9, C.wood)
      const digits = String(m.n ?? 0).split('')
      const w = digits.length * 4 + 1
      px(-Math.floor(w / 2), 7, w, 7, C.white)
      digits.forEach((d, k) => {
        const rows = DIGITS[d] ?? DIGITS['0']!
        rows.forEach((row, j) => {
          for (let i = 0; i < 3; i++) if (row[i] === '#') r(x - Math.floor(w / 2) + 1 + k * 4 + i, y - 13 + j, 1, 1, C.ink)
        })
      })
      break
    }
    case 'bridge':
      px(-6, 0, 12, 2, C.wood); px(-6, 2, 1, 4, C.wood); px(5, 2, 1, 4, C.wood); px(-6, 5, 12, 1, C.wood)
      break
  }
}

// A wonder's silhouette: for each column from its middle, how high its top stands. Read off its own
// drawing (smoke is not something to stand on), so climbing follows exactly what is drawn.
const profiles = new Map<string, Map<number, number>>()
export function profileOf(m: Mark): Map<number, number> {
  const key = `${m.kind}:${m.shape ?? ''}:${m.n ?? ''}`
  let p = profiles.get(key)
  if (!p) {
    const tops = new Map<number, number>()
    drawMark((x, y, w, h, c) => {
      if (c === C.smoke || w <= 0 || h <= 0) return
      for (let dx = x; dx < x + w; dx++) tops.set(dx, Math.max(tops.get(dx) ?? 0, -y))
    }, m, 0, 0, 0)
    p = tops
    profiles.set(key, p)
  }
  return p
}

// what each says when it appears, and again when the character walks up to it
const LINES: Record<string, Words> = {
  stele: { zh: '一块碑，立在我落下来的地方。上面刻着：「{label}」', ja: '落ちてきた場所に碑が立っている。刻まれているのは「{label}」', en: 'A stele where I fell in. It reads: "{label}"' },
  deploy: { zh: '发射台。那段对话从这里往外发射过东西。', ja: '発射台。あの会話はここから何かを打ち上げた。', en: 'A launch pad. The conversation sent something out from here.' },
  build: { zh: '锻炉。东西在这里被烧成了形状，一共 {n} 炉。', ja: '鍛冶炉。ここで物が形に焼き上げられた。全部で {n} 回。', en: 'A forge. Things were fired into shape here, {n} batches so far.' },
  test: { zh: '试炼场。{n} 次，它们在这里证明自己没坏。', ja: '試練場。{n} 回、ここで壊れていないことを証明した。', en: 'A proving ground. {n} times, things proved here they were not broken.' },
  git: { zh: '一棵分叉的树，{n} 根枝。每一枝都是一个可能的过去。', ja: '枝分かれした木。枝は {n} 本、どれもありえた過去。', en: 'A branching tree, {n} branches. Each is a past that could have been.' },
  install: { zh: '依赖森林。{n} 次，它把别人的东西种了进来。', ja: '依存の森。{n} 回、よその物をここに植えた。', en: 'A dependency grove. {n} times, it planted someone else’s things here.' },
  file: { zh: '{label}。改了 {n} 次，改成了一座纪念碑。', ja: '{label}。{n} 回書き換えられて、記念碑になった。', en: '{label}. Changed {n} times, it became a monument.' },
  mile: { zh: '{n} 格。空白在后退。', ja: '{n} マス。空白が後ずさりしていく。', en: '{n} cells. The blankness is backing off.' },
  mile1000: { zh: '一千格。无限减去一千，还是无限。', ja: '千マス。無限から千を引いても、無限のまま。', en: 'A thousand cells. Infinity minus a thousand is still infinity.' },
  bridge: { zh: '那道裂缝上架起了一座桥：那个错后来修好了。', ja: 'あの裂け目に橋が架かった。あのエラーはあとで直った。', en: 'A bridge over that rift: the error got fixed later.' },
}
export const lineOf = (m: Mark): Words => (m.kind === 'mile' && m.n === 1000 ? LINES.mile1000! : LINES[m.kind] ?? LINES.stele!)
