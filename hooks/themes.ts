// The ten sheets of A Visitor from the Fourth Dimension (web/js/world.js THEMES), cut down to one line:
// each names its own colours for the cells and for the vista behind the line (on the sheets that have
// one), and one ambient motion of its own. A session picks one at random when it starts.

import type { Cell } from '../types'
import type { Words } from './i18n'

// a rect in the view's art pixels
export type Draw = (x: number, y: number, w: number, h: number, c: string) => void

export type Theme = {
  id: string
  name: Words
  intro: Words
  bg?: string                         // the sheet behind the line; absent, the band shows through
  cell: Record<Cell, string>          // the ground strip under each cell
  water: [string, string]             // body, glint
  rift: [string, string]              // gap, its sparks
  rock: string
  peak: string
  cap: string                         // the snow on the vista's highest peaks
  tree: [string, string]              // the vista's woods, and a second tone
  // ambient motion behind the line; t in seconds, camX the view's left edge, W/H the view, G0 the line
  decor?: (r: Draw, t: number, camX: number, W: number, H: number, G0: number) => void
}

// a stable pseudo-random in 0..1 for integer n
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export const THEMES: Theme[] = [
  {
    id: 'earth',
    name: { zh: '地球', ja: '地球', en: 'Earthlike' },
    intro: { zh: '这张纸上画的像是一颗有水有山的星球。', ja: 'この紙に描かれているのは、水と山のある惑星のようだ。', en: 'This sheet looks like a drawing of a planet, with water and mountains.' },
    cell: { grass: '#80ae5c', sand: '#e2d09c', water: '#528cbe', rock: '#8a8276', peak: '#8a8276', forest: '#60944c', rift: '#2c223a' },
    water: ['#528cbe', '#7ab4dc'], rift: ['#2c223a', '#966edc'],
    rock: '#9c9486', peak: '#746e66', cap: '#d6e2f0',
    tree: ['#3a6838', '#70523a'],
    decor: (r, t, _c, W) => {
      // two clouds drift past
      for (let k = 0; k < 2; k++) {
        const x = Math.round(((t * (3 + k) + k * 110) % (W + 40)) - 20), y = 6 + k * 7
        r(x, y, 10, 2, '#e4e8ec'); r(x + 3, y - 2, 5, 2, '#e4e8ec')
      }
    },
  },
  {
    id: 'foil',
    name: { zh: '二向箔', ja: '二向箔', en: 'Dual-Vector Foil' },
    intro: { zh: '这张纸的原材料是一整个星系：压平，铺开，裁成现在这个尺寸。', ja: 'この紙の原料はひとつの星系まるごと。平らにのばして、広げて、この大きさに切りそろえた。', en: 'This sheet’s raw material was an entire star system: flattened, spread out, trimmed to size.' },
    cell: { grass: '#b0aabe', sand: '#dcc4aa', water: '#5878c4', rock: '#a87860', peak: '#846054', forest: '#46966e', rift: '#14141c' },
    water: ['#5878c4', '#8caae6'], rift: ['#14141c', '#c8c8ff'],
    rock: '#a87860', peak: '#846054', cap: '#d2aa8c',
    tree: ['#46966e', '#96dca0'],
    decor: (r, t, _c, W, H) => {
      // an aftershock of flattening sweeps the sheet every twelve seconds
      const x = Math.round(((t % 12) / 12) * (W + 20) - 10)
      r(x, 0, 1, H, '#dcdcf6'); r(x - 3, 0, 1, H, '#ececfa')
    },
  },
  {
    id: 'dune',
    name: { zh: '沙丘', ja: '砂丘', en: 'Dune' },
    intro: { zh: '这张纸是一整片沙漠。水在这里比什么都贵。', ja: 'この紙は一面の砂漠。ここでは水が何より高い。', en: 'This sheet is one long desert. Water is worth more than anything here.' },
    cell: { grass: '#ce9652', sand: '#deb06e', water: '#ded6c4', rock: '#96705a', peak: '#96705a', forest: '#d67830', rift: '#462e24' },
    water: ['#ded6c4', '#f8f4ec'], rift: ['#462e24', '#c88c50'],
    rock: '#96705a', peak: '#6e5042', cap: '#eee2d2',
    tree: ['#d67830', '#f6aa50'],
    decor: (r, t, _c, W, _H, G0) => {
      // a sandworm swims under the line, its back breaking the surface halfway
      const p = (t % 20) / 20, x = Math.round(p * (W + 40) - 20)
      const up = Math.round(Math.sin(p * Math.PI) * 3)
      for (let k = 0; k < 5; k++) r(x - k * 3, G0 + 3 - (k === 2 ? up : Math.max(0, up - 2)), 3, 2, '#8a6040')
      // wind carries a few grains
      for (let k = 0; k < 4; k++) r(Math.round((t * 30 + k * 53) % W), G0 - 4 - ((k * 7) % 9), 1, 1, '#e6c290')
    },
  },
  {
    id: 'solaris',
    name: { zh: '索拉里斯', ja: 'ソラリス', en: 'Solaris' },
    intro: { zh: '这张纸的大部分是海，而且那片海好像在看我。', ja: 'この紙のほとんどは海で、その海はこちらを見ているらしい。', en: 'Most of this sheet is ocean, and the ocean seems to be watching me.' },
    cell: { grass: '#c48caa', sand: '#c8dcd2', water: '#3c8c8c', rock: '#96a0aa', peak: '#96a0aa', forest: '#965aa0', rift: '#101e24' },
    water: ['#3c8c8c', '#78c8be'], rift: ['#101e24', '#78e6d2'],
    rock: '#96a0aa', peak: '#be6e5a', cap: '#78a0e6',
    tree: ['#965aa0', '#d2a0dc'],
    decor: (r, t) => {
      // two suns, one red, one blue, bobbing with the ocean's breath
      const b = Math.round(Math.sin(t / 2) + 1)
      r(18, 5 - b, 3, 3, '#e06a50'); r(30, 3 + b, 2, 2, '#78a0e6')
    },
  },
  {
    id: 'crystal',
    name: { zh: '晶化', ja: '結晶化', en: 'Crystallized' },
    intro: { zh: '这张纸上的东西都在慢慢变成晶体。', ja: 'この紙の上のものは、どれもゆっくり結晶になっていく。', en: 'Everything on this sheet is slowly turning to crystal.' },
    cell: { grass: '#96c8be', sand: '#e2ded6', water: '#82b4d2', rock: '#50505c', peak: '#50505c', forest: '#5aa0aa', rift: '#1e1a28' },
    water: ['#82b4d2', '#c8e6fa'], rift: ['#1e1a28', '#f0f0ff'],
    rock: '#50505c', peak: '#8c78b4', cap: '#dcc8fa',
    tree: ['#5aa0aa', '#bef0f5'],
    decor: (r, t, _c, W, _H, G0) => {
      // a patch of light drifts between the crystals
      const x = Math.round((t * 14) % W), y = G0 - 10 + Math.round(Math.sin(t) * 3)
      r(x, y - 1, 1, 3, '#ffffff'); r(x - 1, y, 3, 1, '#ffffff')
    },
  },
  {
    id: 'pcb',
    name: { zh: '电路板', ja: '回路基板', en: 'Circuit Board' },
    intro: { zh: '这张纸是一块电路板。那段对话大概就是在这样的东西上跑起来的。', ja: 'この紙は回路基板。あの会話もきっとこういうものの上で動いていた。', en: 'This sheet is a circuit board. The conversation probably ran on something like it.' },
    bg: '#1a643a',
    cell: { grass: '#40985a', sand: '#e8ece2', water: '#d8aa52', rock: '#2c2c32', peak: '#2c2c32', forest: '#40985a', rift: '#140e0a' },
    water: ['#d8aa52', '#f6d890'], rift: ['#140e0a', '#ff963c'],
    rock: '#2c2c32', peak: '#1e1e22', cap: '#d4d6dc',
    tree: ['#4aa864', '#d8aa52'],
    decor: (r, t, camX, W, _H, G0) => {
      // rows of vias, and a data packet running the trace
      for (let x = 8 - (camX % 16); x < W; x += 16) for (const y of [8, 24]) r(x, y, 2, 2, '#2a7a4c')
      r(Math.round((t * 40) % W), G0, 3, 2, '#ffe08a')
    },
  },
  {
    id: 'ink',
    name: { zh: '水墨', ja: '水墨', en: 'Ink Wash' },
    intro: { zh: '这张纸是一幅水墨，一处一处的小景拼起来的。墨还没干。', ja: 'この紙は一幅の水墨画。小さな景色をつなぎ合わせてある。墨はまだ乾いていない。', en: 'This sheet is an ink painting, pieced together from one small scene after another. The ink is still wet.' },
    bg: '#f4f2ec',
    cell: { grass: '#646460', sand: '#c4c0b8', water: '#e8e6e0', rock: '#929090', peak: '#929090', forest: '#646460', rift: '#1a181a' },
    water: ['#e8e6e0', '#969698'], rift: ['#1a181a', '#c43428'],
    rock: '#929090', peak: '#c4c4c6', cap: '#646460',
    tree: ['#646460', '#3c3c3a'],
  },
  {
    id: 'blueprint',
    name: { zh: '蓝图', ja: '青図', en: 'Blueprint' },
    intro: { zh: '这张纸是一张蓝图，画的是一座地下迷宫。什么都还没造，但每间房都标好了尺寸。', ja: 'この紙は地下迷宮の青図。まだ何も建っていないが、どの部屋にも寸法が書いてある。', en: 'This sheet is a blueprint of an underground maze. Nothing has been built yet, but every room has its dimensions.' },
    bg: '#1e4e92',
    cell: { grass: '#e2ecff', sand: '#c8dcfa', water: '#1c3e80', rock: '#e2ecff', peak: '#e2ecff', forest: '#e2ecff', rift: '#102042' },
    water: ['#1c3e80', '#8cb0e6'], rift: ['#102042', '#f06450'],
    rock: '#4a78c0', peak: '#6088cc', cap: '#e2ecff',
    tree: ['#c8dcfa', '#e2ecff'],
    decor: (r, _t, camX, W, H) => {
      // the grid every room is measured on
      for (let x = -(camX % 8); x < W; x += 8) r(x, 0, 1, H, '#28599e')
      for (let y = 0; y < H; y += 8) r(0, y, W, 1, '#28599e')
    },
  },
  {
    id: 'slide',
    name: { zh: '切片', ja: '組織切片', en: 'Tissue Slide' },
    intro: { zh: '这张纸是一片染过色的切片，粉的是细胞质，紫的是细胞核。', ja: 'この紙は染色した組織切片。ピンクは細胞質、紫は細胞核。', en: 'This sheet is a stained tissue slice: pink for cytoplasm, purple for nuclei.' },
    bg: '#f0dbe2',
    cell: { grass: '#d6a8bc', sand: '#d4aaba', water: '#f4e9ec', rock: '#e0bcc6', peak: '#e0bcc6', forest: '#c890b0', rift: '#5a1432' },
    water: ['#f4e9ec', '#c83a4a'], rift: ['#5a1432', '#fac8dc'],
    rock: '#e0bcc6', peak: '#bcaec8', cap: '#8a5aa0',
    tree: ['#eacad6', '#6a3a8a'],
    decor: (r, t, camX, W, H) => {
      // nuclei scattered through the section, drifting a little
      for (let k = 0; k < 9; k++) {
        const x = Math.round((((hash(k) * 400 - camX * 0.3 + Math.sin(t / 3 + k) * 2) % W) + W) % W)
        r(x, Math.round(hash(k + 50) * (H - 20)) + 2, 2, 2, '#c9a0c8')
      }
    },
  },
  {
    id: 'sky',
    name: { zh: '深空', ja: '深宇宙', en: 'Deep Sky' },
    intro: { zh: '这张纸是透明的。展开的地方，能看见它背后的天空。', ja: 'この紙は透けている。広げたところから、その向こうの空が見える。', en: 'This sheet is transparent. Wherever it unfolds, I can see the sky behind it.' },
    bg: '#0a0c1a',
    cell: { grass: '#3c4470', sand: '#5a5e78', water: '#181c2a', rock: '#8c7864', peak: '#8c7864', forest: '#784670', rift: '#1e1432' },
    water: ['#181c2a', '#5a6488'], rift: ['#1e1432', '#b496ff'],
    rock: '#8c7864', peak: '#dcbea0', cap: '#f0f4ff',
    tree: ['#784670', '#c890c0'],
    decor: (r, t, camX, W, H) => {
      // stars that twinkle, and now and then a meteor surfacing mid-sky
      for (let k = 0; k < 40; k++) {
        const x = Math.round((((hash(k) * 800 - camX * 0.2) % W) + W) % W), y = Math.round(hash(k + 99) * (H - 14))
        r(x, y, 1, 1, Math.floor(t * 2 + k) % 7 === 0 ? '#ffffff' : '#6a7090')
      }
      const p = t % 15
      if (p < 0.8) {
        const x = Math.round(40 + hash(Math.floor(t / 15)) * 120 + p * 30), y = Math.round(6 + p * 8)
        r(x, y, 2, 1, '#ffffff'); r(x - 2, y - 1, 2, 1, '#9aa4d0')
      }
    },
  },
]

export const themeOf = (id: string | null | undefined) => THEMES.find(t => t.id === id) ?? THEMES[0]!

// --- the people of each sheet, and its one natural event --------------------------------------
// Lineland's residents are short strokes on the line in the sheet's own colour (the game's civ.js
// gives every terrain its own people); the character can only hop over them. Every minute or two a
// sheet has its event: a moment of weather, wildlife or physics that crosses the view and goes.

export type SheetEvent = {
  seconds: number
  // p runs 0..1 over the event; W/H the view, G0 the line
  draw: (r: Draw, p: number, t: number, W: number, H: number, G0: number) => void
  words: Words
}

export const FOLK: Record<string, string> = {
  earth: '#6c5a48', foil: '#8a7aa8', dune: '#7a4a2a', solaris: '#3c8c8c', crystal: '#7a64a8',
  pcb: '#e8ece2', ink: '#3c3c3a', blueprint: '#e2ecff', slide: '#6a3a8a', sky: '#c8d0f0',
}

export const EVENTS: Record<string, SheetEvent> = {
  earth: {
    seconds: 9,
    draw: (r, p, t, W) => {
      // a shower crossing the sheet, a rainbow after it
      const n = Math.round(Math.sin(p * Math.PI) * 30)
      for (let k = 0; k < n; k++) r(Math.round(hash(k) * W), Math.round(((t * 40 + hash(k + 7) * 50) % 46)), 1, 2, '#7ab4dc')
      if (p > 0.6) ['#e06a50', '#e2ba5c', '#80ae5c', '#528cbe'].forEach((c, k) => r(W - 60 + k, 6 + k, 40 - k * 2, 1, c))
    },
    words: { zh: '下了一阵雨。在这里，雨是从纸的一边落到另一边的。', ja: 'ひとしきり雨が降った。ここでは雨は紙の端から端へ降る。', en: 'A shower passed. Here, rain falls from one edge of the paper to the other.' },
  },
  foil: {
    seconds: 8,
    draw: (r, p, _t, W) => {
      // a flattened planet sliding by: rings of core, mantle, crust, ocean, air
      const x = Math.round(p * (W + 40) - 20)
      ;['#f2d07a', '#d6805c', '#a87860', '#5878c4', '#c8dcfa'].forEach((c, k) => r(x - 10 + k * 2, 10 + k, 20 - k * 4, 1, c))
    },
    words: { zh: '一颗压平的行星从旁边滑过去，一圈一圈，地核在最里面。', ja: '平たくなった惑星がそばを滑っていった。輪の一番内側が核。', en: 'A flattened planet slid past, ring by ring, its core in the middle.' },
  },
  dune: {
    seconds: 10,
    draw: (r, p, t, W, _H, G0) => {
      // a sandstorm: streaks blowing across
      const n = Math.round(Math.sin(p * Math.PI) * 40)
      for (let k = 0; k < n; k++) r(Math.round((hash(k) * W + t * 90) % W), Math.round(hash(k + 3) * (G0 - 4)), 4, 1, '#e6c290')
    },
    words: { zh: '起了沙暴。沙粒从线上刮过去，一粒都没离开这条线。', ja: '砂嵐。砂粒が線の上を吹き抜けていく。一粒も線から外れない。', en: 'A sandstorm. Grains blew along the line, and not one left it.' },
  },
  solaris: {
    seconds: 8,
    draw: (r, p, _t, W, _H, G0) => {
      // the ocean raising a symmetriad and taking it back
      const h = Math.round(Math.sin(p * Math.PI) * 18), x = Math.round(W * 0.7)
      r(x - 1, G0 - h, 3, h, '#3c8c8c'); r(x - 4, G0 - Math.round(h * 0.6), 9, 1, '#78c8be'); r(x - 3, G0 - Math.round(h * 0.85), 7, 1, '#78c8be')
    },
    words: { zh: '海立起了一座对称体，又把它收了回去。', ja: '海が対称体をひとつ立ち上げ、また引き戻した。', en: 'The ocean raised a symmetriad and took it back.' },
  },
  crystal: {
    seconds: 7,
    draw: (r, p, t, W, _H, G0) => {
      // a crystal blooming out of the line, glinting, and dimming
      const h = Math.round(Math.min(1, p * 3) * 14), x = Math.round(W * 0.35)
      r(x, G0 - h, 2, h, '#8c78b4'); r(x + 3, G0 - Math.round(h * 0.7), 2, Math.round(h * 0.7), '#dcc8fa'); r(x - 3, G0 - Math.round(h * 0.5), 2, Math.round(h * 0.5), '#8c78b4')
      if (Math.floor(t * 4) % 2) r(x, G0 - h - 2, 1, 1, '#ffffff')
    },
    words: { zh: '一簇晶体从线上长了出来。光在里面来回走，找不到出口。', ja: '線から結晶がひとかたまり生えてきた。光が中を行き来して出口を探している。', en: 'A crystal cluster grew out of the line. Light wanders inside it, looking for the way out.' },
  },
  pcb: {
    seconds: 5,
    draw: (r, p, t, W, _H, G0) => {
      // a short circuit: sparks, then a curl of smoke
      const x = Math.round(W * 0.6)
      if (p < 0.4) for (let k = 0; k < 6; k++) r(x + Math.round(Math.cos(k + t * 9) * 4), G0 - 2 + Math.round(Math.sin(k + t * 9) * 3), 1, 1, '#ffe08a')
      else r(x + Math.round((p - 0.4) * 6), G0 - 4 - Math.round((p - 0.4) * 30), 2, 2, '#6a6a6a')
    },
    words: { zh: '短路了一下。电从走线里漏出来，留下一点焦味。', ja: '一瞬ショートした。電気が配線から漏れて、焦げた匂いが残った。', en: 'A short circuit. Current leaked from the trace and left a smell of scorching.' },
  },
  ink: {
    seconds: 9,
    draw: (r, p, _t, W) => {
      // a few birds, single brushstrokes, crossing the sky
      for (let k = 0; k < 3; k++) {
        const x = Math.round(p * (W + 30) - 15 + k * 8), y = 8 + k * 3 + Math.round(Math.sin(p * 12 + k) * 1)
        r(x, y, 2, 1, '#3c3c3a'); r(x + 2, y - 1, 2, 1, '#3c3c3a')
      }
    },
    words: { zh: '几只鸟飞过去，每只都只是一笔。', ja: '鳥が何羽か飛んでいった。どれも筆のひと払い。', en: 'A few birds flew over, each a single brushstroke.' },
  },
  blueprint: {
    seconds: 6,
    draw: (r, p, _t, W, _H, G0) => {
      // the red pen circling something on the plan
      const x = Math.round(W * 0.5), y = G0 - 8, n = Math.round(p * 16)
      for (let k = 0; k < n; k++) r(x + Math.round(Math.cos((k / 16) * Math.PI * 2) * 9), y + Math.round(Math.sin((k / 16) * Math.PI * 2) * 5), 1, 1, '#f06450')
    },
    words: { zh: '红笔在图纸上圈了一处。图纸没说为什么。', ja: '赤ペンが図面のどこかを丸で囲んだ。理由は書いていない。', en: 'The red pen circled a spot on the plan. The plan does not say why.' },
  },
  slide: {
    seconds: 8,
    draw: (r, p, _t, W, _H, G0) => {
      // a white cell chasing a bacterium down the line, and catching it
      const bx = Math.round(p * W * 0.8 + 20), wx = Math.round(p * W * 0.85 + 4)
      if (wx < bx - 2) r(bx, G0 - 3, 3, 1, '#4a8a3a')
      r(wx - 2, G0 - 5, 5, 4, '#f4f0f2'); r(wx - 1, G0 - 4, 2, 2, '#8a5aa0')
    },
    words: { zh: '一个白细胞追上了一个细菌，把它吞了。', ja: '白血球が細菌に追いついて、飲み込んだ。', en: 'A white cell caught up with a bacterium and swallowed it.' },
  },
  sky: {
    seconds: 7,
    draw: (r, p, _t, W) => {
      // a comet crossing, tail behind it
      const x = Math.round(p * (W + 40) - 20), y = Math.round(6 + p * 14)
      r(x, y, 2, 2, '#ffffff')
      for (let k = 1; k < 8; k++) r(x - k * 2, y - Math.round(k * 0.6), 2, 1, k < 4 ? '#c8d0f0' : '#6a7090')
    },
    words: { zh: '一颗彗星划过去。它要很多年才会回来。', ja: '彗星がひとつ横切った。戻ってくるのはずっと先だ。', en: 'A comet went by. It will be many years before it comes back.' },
  },
}

// --- things from outside the paper ------------------------------------------------------------
// The game's cross-dimension effects, on a line: something three-dimensional meets the sheet, and the
// sheet only ever holds the part of it touching the paper, a cross-section that appears, changes and goes.

// a filled disc, its edge ragged by `rag`
const disc = (r: Draw, x: number, y: number, R: number, c: string, rag = 0) => {
  for (let dy = -Math.floor(R); dy <= R; dy++) {
    const w = Math.round(Math.sqrt(Math.max(0, R * R - dy * dy)) * (1 + rag * (hash(dy * 3 + 1) - 0.5)))
    r(Math.round(x) - w, Math.round(y) + dy, w * 2 + 1, 1, c)
  }
}
// a one-pixel segment
const seg = (r: Draw, x0: number, y0: number, x1: number, y1: number, c: string) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let k = 0; k <= n; k++) r(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), 1, 1, c)
}
const ramp = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)))

export const CROSSINGS: Record<string, SheetEvent> = {
  blueprint: {
    seconds: 10,
    draw: (r, p, _t, W, _H, G0) => {
      // a ruler laid along the top of the plan, and a compass drawing an arc over the line
      const out = ramp(p, 0.85, 1), ry = Math.round(-12 + (ramp(p, 0, 0.12) - out) * 16), rx = Math.round(W * 0.15)
      r(rx, ry, 90, 6, '#e8dca8')
      for (let k = 0; k < 90; k += 3) r(rx + k, ry, 1, k % 15 ? 2 : 4, '#7a6a40')
      const nx = Math.round(W * 0.62), ny = G0 - 2, R = 16
      const q = ramp(p, 0.25, 0.8)
      for (let a = 0; a <= q * Math.PI; a += 1 / R) r(Math.round(nx + R * Math.cos(Math.PI - a)), Math.round(ny - R * Math.sin(Math.PI - a)), 1, 1, '#e2ecff')
      if (p < 0.15 || p > 0.88) return
      // the hinge leans the way the pencil is going, the way a hand tilts a compass
      const a = q * Math.PI, px = nx - R * Math.cos(a), py = ny - R * Math.sin(a)
      const hx = (nx + px) / 2 + Math.sin(a) * 10, hy = (ny + py) / 2 - Math.abs(Math.cos(a)) * 10 - 2
      seg(r, nx, ny, hx, hy, '#c8ccd4'); seg(r, hx, hy, px, py, '#c8ccd4')
      r(Math.round(hx) - 1, Math.round(hy) - 3, 3, 3, '#9aa0aa'); r(Math.round(px), Math.round(py), 1, 1, '#3a3a40')
    },
    words: { zh: '纸外面伸进来一把尺子和一副圆规，量了量，画了一道弧，又走了。', ja: '紙の外から定規とコンパスが入ってきて、測って、弧をひとつ描いて、去っていった。', en: 'A ruler and a compass reached in from outside the paper, measured, drew an arc, and left.' },
  },
  ink: {
    seconds: 10,
    draw: (r, p, _t, W, _H, G0) => {
      // a drop falling onto the paper: its shadow first, then the blot, spreading and soaking in
      const x = Math.round(W * 0.42), y = G0 - 4
      if (p < 0.15) return disc(r, x, y, 4 - p * 20, '#c4c0b8')
      const R = 2 + ramp(p, 0.15, 0.4) * 6, c = p < 0.6 ? '#1a181a' : p < 0.8 ? '#646460' : '#c4c0b8'
      disc(r, x, y, R + 1.5, '#92909066', 0.6)
      disc(r, x, y, R, c, 0.5)
      for (let k = 0; k < 5; k++) r(Math.round(x + (hash(k + 20) - 0.5) * R * 4), Math.round(y + (hash(k + 30) - 0.5) * R * 2.5), 1, 1, c)
    },
    words: { zh: '一滴墨从纸外面落了下来。落到纸上之前，这里谁也看不见它。', ja: '紙の外から墨が一滴落ちてきた。紙に触れるまで、ここでは誰にも見えなかった。', en: 'A drop of ink fell from outside the paper. Until it touched, no one here could see it.' },
  },
  slide: {
    seconds: 9,
    draw: (r, p, _t, W, _H, G0) => {
      // the focus knob turning: the focal plane sinks through the section, and each nucleus it passes
      // swells and shrinks like a slice through a ball
      for (let k = 0; k < 7; k++) {
        const x = 10 + hash(k + 200) * (W - 20), y = 6 + hash(k + 300) * (G0 - 16)
        const d = 0.12 + hash(k + 400) * 0.76, R0 = 4 + hash(k + 500) * 4
        const R = Math.sqrt(Math.max(0, R0 * R0 - ((p - d) * 45) ** 2))
        if (R < 0.8) continue
        disc(r, x, y, R, '#a070b0')
        if (R > 2.5) r(Math.round(x), Math.round(y), 1, 1, '#5a2a7a')
      }
    },
    words: { zh: '有人在拧调焦旋钮。细胞核一个个胀大、缩小、消失——原来它们都是球。', ja: '誰かがピントのつまみを回している。細胞核がひとつずつ膨らみ、縮み、消えた。どれも球だったのだ。', en: 'Someone is turning the focus knob. The nuclei swell, shrink and vanish one by one: they were balls all along.' },
  },
  sky: {
    seconds: 8,
    draw: (r, p, _t, W) => {
      // a meteor through the paper: a white point, a hole burned open, its rim cooling
      const x = Math.round(W * 0.38), y = 14
      if (p < 0.08) return void (r(x - 1, y, 3, 1, '#ffffff'), r(x, y - 1, 1, 3, '#ffffff'))
      const R = 1 + ramp(p, 0.08, 0.3) * 4
      disc(r, x, y, R + 1, p < 0.4 ? '#ffd070' : p < 0.7 ? '#e0703a' : '#6a3a2a', 0.3)
      disc(r, x, y, R, '#000000')
    },
    words: { zh: '一颗流星从纸外面穿了过去，烧出一个洞。对这条线来说，它只存在了一瞬。', ja: '流星が紙の外から突き抜けて、穴を焼いていった。この線にとって、それは一瞬だけ存在した。', en: 'A meteor came through the paper from outside and burned a hole. For this line, it existed for an instant.' },
  },
}
