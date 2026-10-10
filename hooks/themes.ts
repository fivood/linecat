// The ten sheets of A Visitor from the Fourth Dimension (web/js/world.js THEMES), cut down to one line:
// each names its own colours for the cells, how its mountains and woods are drawn, and one ambient
// motion of its own. A session picks one at random when it starts.

import type { Cell } from '../types'

// a rect in the view's art pixels
export type Draw = (x: number, y: number, w: number, h: number, c: string) => void

export type Theme = {
  id: string
  name: string
  intro: string
  bg?: string                         // the sheet behind the line; absent, the band shows through
  cell: Record<Cell, string>          // the ground strip under each cell
  water: [string, string]             // body, glint
  rift: [string, string]              // gap, its sparks
  rock: string
  peak: string
  cap: string                         // snow, rings, facets or pins, by peakStyle
  peakStyle: 'mount' | 'contour' | 'facet' | 'chip' | 'column' | 'star' | 'wash'
  tree: [string, string]
  treeStyle: 'tree' | 'speck' | 'bush' | 'spike' | 'shard' | 'trace' | 'pine' | 'rubble' | 'gland' | 'nebula'
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
    id: 'earth', name: '地球', intro: '这张纸上画的像是一颗有水有山的星球。',
    cell: { grass: '#80ae5c', sand: '#e2d09c', water: '#528cbe', rock: '#8a8276', peak: '#8a8276', forest: '#60944c', rift: '#2c223a' },
    water: ['#528cbe', '#7ab4dc'], rift: ['#2c223a', '#966edc'],
    rock: '#9c9486', peak: '#746e66', cap: '#d6e2f0', peakStyle: 'mount',
    tree: ['#3a6838', '#70523a'], treeStyle: 'tree',
    decor: (r, t, _c, W) => {
      // two clouds drift past
      for (let k = 0; k < 2; k++) {
        const x = Math.round(((t * (3 + k) + k * 110) % (W + 40)) - 20), y = 6 + k * 7
        r(x, y, 10, 2, '#e4e8ec'); r(x + 3, y - 2, 5, 2, '#e4e8ec')
      }
    },
  },
  {
    id: 'foil', name: '二向箔', intro: '这张纸的原材料是一整个星系：压平，铺开，裁成现在这个尺寸。',
    cell: { grass: '#b0aabe', sand: '#dcc4aa', water: '#5878c4', rock: '#a87860', peak: '#846054', forest: '#46966e', rift: '#14141c' },
    water: ['#5878c4', '#8caae6'], rift: ['#14141c', '#c8c8ff'],
    rock: '#a87860', peak: '#846054', cap: '#d2aa8c', peakStyle: 'contour',
    tree: ['#46966e', '#96dca0'], treeStyle: 'speck',
    decor: (r, t, _c, W, H) => {
      // an aftershock of flattening sweeps the sheet every twelve seconds
      const x = Math.round(((t % 12) / 12) * (W + 20) - 10)
      r(x, 0, 1, H, '#dcdcf6'); r(x - 3, 0, 1, H, '#ececfa')
    },
  },
  {
    id: 'dune', name: '沙丘', intro: '这张纸是一整片沙漠。水在这里比什么都贵。',
    cell: { grass: '#ce9652', sand: '#deb06e', water: '#ded6c4', rock: '#96705a', peak: '#96705a', forest: '#d67830', rift: '#462e24' },
    water: ['#ded6c4', '#f8f4ec'], rift: ['#462e24', '#c88c50'],
    rock: '#96705a', peak: '#6e5042', cap: '#eee2d2', peakStyle: 'mount',
    tree: ['#d67830', '#f6aa50'], treeStyle: 'bush',
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
    id: 'solaris', name: '索拉里斯', intro: '这张纸的大部分是海，而且那片海好像在看我。',
    cell: { grass: '#c48caa', sand: '#c8dcd2', water: '#3c8c8c', rock: '#96a0aa', peak: '#96a0aa', forest: '#965aa0', rift: '#101e24' },
    water: ['#3c8c8c', '#78c8be'], rift: ['#101e24', '#78e6d2'],
    rock: '#96a0aa', peak: '#be6e5a', cap: '#78a0e6', peakStyle: 'mount',
    tree: ['#965aa0', '#d2a0dc'], treeStyle: 'spike',
    decor: (r, t) => {
      // two suns, one red, one blue, bobbing with the ocean's breath
      const b = Math.round(Math.sin(t / 2) + 1)
      r(18, 5 - b, 3, 3, '#e06a50'); r(30, 3 + b, 2, 2, '#78a0e6')
    },
  },
  {
    id: 'crystal', name: '晶化', intro: '这张纸上的东西都在慢慢变成晶体。',
    cell: { grass: '#96c8be', sand: '#e2ded6', water: '#82b4d2', rock: '#50505c', peak: '#50505c', forest: '#5aa0aa', rift: '#1e1a28' },
    water: ['#82b4d2', '#c8e6fa'], rift: ['#1e1a28', '#f0f0ff'],
    rock: '#50505c', peak: '#8c78b4', cap: '#dcc8fa', peakStyle: 'facet',
    tree: ['#5aa0aa', '#bef0f5'], treeStyle: 'shard',
    decor: (r, t, _c, W, _H, G0) => {
      // a patch of light drifts between the crystals
      const x = Math.round((t * 14) % W), y = G0 - 10 + Math.round(Math.sin(t) * 3)
      r(x, y - 1, 1, 3, '#ffffff'); r(x - 1, y, 3, 1, '#ffffff')
    },
  },
  {
    id: 'pcb', name: '电路板', intro: '这张纸是一块电路板。那段对话大概就是在这样的东西上跑起来的。',
    bg: '#1a643a',
    cell: { grass: '#40985a', sand: '#e8ece2', water: '#d8aa52', rock: '#2c2c32', peak: '#2c2c32', forest: '#40985a', rift: '#140e0a' },
    water: ['#d8aa52', '#f6d890'], rift: ['#140e0a', '#ff963c'],
    rock: '#2c2c32', peak: '#1e1e22', cap: '#d4d6dc', peakStyle: 'chip',
    tree: ['#4aa864', '#d8aa52'], treeStyle: 'trace',
    decor: (r, t, camX, W, _H, G0) => {
      // rows of vias, and a data packet running the trace
      for (let x = 8 - (camX % 16); x < W; x += 16) for (const y of [8, 24]) r(x, y, 2, 2, '#2a7a4c')
      r(Math.round((t * 40) % W), G0, 3, 2, '#ffe08a')
    },
  },
  {
    id: 'ink', name: '水墨', intro: '这张纸是一幅水墨，一处一处的小景拼起来的。墨还没干。',
    bg: '#f4f2ec',
    cell: { grass: '#646460', sand: '#c4c0b8', water: '#e8e6e0', rock: '#929090', peak: '#929090', forest: '#646460', rift: '#1a181a' },
    water: ['#e8e6e0', '#969698'], rift: ['#1a181a', '#c43428'],
    rock: '#929090', peak: '#c4c4c6', cap: '#646460', peakStyle: 'wash',
    tree: ['#646460', '#3c3c3a'], treeStyle: 'pine',
    decor: (r, _t, camX, W, _H, G0) => {
      // distant hills, fainter the farther, sliding slower than the line
      for (const [k, c, p] of [[0, '#e2e0dc', 0.25], [1, '#d2d0cc', 0.5]] as const) {
        for (let x = 0; x < W; x += 2) {
          const u = x + camX * p + k * 300
          const h = Math.round(6 + 5 * Math.sin(u / 23) + 3 * Math.sin(u / 9) - k * 2)
          if (h > 0) r(x, G0 - 4 - h, 2, h + 4, c)
        }
      }
    },
  },
  {
    id: 'blueprint', name: '蓝图', intro: '这张纸是一张蓝图，画的是一座地下迷宫。什么都还没造，但每间房都标好了尺寸。',
    bg: '#1e4e92',
    cell: { grass: '#e2ecff', sand: '#c8dcfa', water: '#1c3e80', rock: '#e2ecff', peak: '#e2ecff', forest: '#e2ecff', rift: '#102042' },
    water: ['#1c3e80', '#8cb0e6'], rift: ['#102042', '#f06450'],
    rock: '#4a78c0', peak: '#6088cc', cap: '#e2ecff', peakStyle: 'column',
    tree: ['#c8dcfa', '#e2ecff'], treeStyle: 'rubble',
    decor: (r, _t, camX, W, H) => {
      // the grid every room is measured on
      for (let x = -(camX % 8); x < W; x += 8) r(x, 0, 1, H, '#28599e')
      for (let y = 0; y < H; y += 8) r(0, y, W, 1, '#28599e')
    },
  },
  {
    id: 'slide', name: '切片', intro: '这张纸是一片染过色的切片，粉的是细胞质，紫的是细胞核。',
    bg: '#f0dbe2',
    cell: { grass: '#d6a8bc', sand: '#d4aaba', water: '#f4e9ec', rock: '#e0bcc6', peak: '#e0bcc6', forest: '#c890b0', rift: '#5a1432' },
    water: ['#f4e9ec', '#c83a4a'], rift: ['#5a1432', '#fac8dc'],
    rock: '#e0bcc6', peak: '#bcaec8', cap: '#8a5aa0', peakStyle: 'mount',
    tree: ['#eacad6', '#6a3a8a'], treeStyle: 'gland',
    decor: (r, t, camX, W, H) => {
      // nuclei scattered through the section, drifting a little
      for (let k = 0; k < 9; k++) {
        const x = Math.round((((hash(k) * 400 - camX * 0.3 + Math.sin(t / 3 + k) * 2) % W) + W) % W)
        r(x, Math.round(hash(k + 50) * (H - 20)) + 2, 2, 2, '#c9a0c8')
      }
    },
  },
  {
    id: 'sky', name: '深空', intro: '这张纸是透明的。展开的地方，能看见它背后的天空。',
    bg: '#0a0c1a',
    cell: { grass: '#3c4470', sand: '#5a5e78', water: '#181c2a', rock: '#8c7864', peak: '#8c7864', forest: '#784670', rift: '#1e1432' },
    water: ['#181c2a', '#5a6488'], rift: ['#1e1432', '#b496ff'],
    rock: '#8c7864', peak: '#dcbea0', cap: '#f0f4ff', peakStyle: 'star',
    tree: ['#784670', '#c890c0'], treeStyle: 'nebula',
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

// the woods of each sheet, one cell wide, standing on the line at sx
export function drawTree(r: Draw, th: Theme, sx: number, G0: number, i: number) {
  const [a, b] = th.tree
  switch (th.treeStyle) {
    case 'tree': r(sx + 3, G0 - 3, 2, 3, b); r(sx + 1, G0 - 9, 6, 6, a); break
    case 'speck': r(sx, G0 - 2, 8, 2, a); r(sx + (i % 3) * 2 + 1, G0 - 2, 1, 1, b); break
    case 'bush': r(sx + 1, G0 - 3, 6, 3, a); r(sx + 3, G0 - 4, 2, 1, b); break
    case 'spike': r(sx + 3, G0 - 9, 2, 9, a); r(sx + 1, G0 - 6, 6, 1, b); r(sx + 2, G0 - 8, 4, 1, b); break
    case 'shard': r(sx + 1, G0 - 7, 2, 7, a); r(sx + 1, G0 - 7, 1, 7, b); r(sx + 4, G0 - 5, 2, 5, a); r(sx + 4, G0 - 5, 1, 5, b); break
    case 'trace': r(sx, G0 - 3, 8, 1, a); r(sx + 5, G0 - 4, 3, 3, b); break
    case 'pine': r(sx + 3, G0 - 9, 2, 2, a); r(sx + 2, G0 - 7, 4, 2, a); r(sx + 1, G0 - 5, 6, 2, a); r(sx + 3, G0 - 3, 2, 3, b); break
    case 'rubble': for (let k = 0; k < 4; k++) r(sx + ((i * 5 + k * 3) % 8), G0 - 1 - (k % 2) * 2, 1, 1, b); break
    case 'gland':
      r(sx + 1, G0 - 7, 6, 1, b); r(sx + 1, G0 - 2, 6, 1, b); r(sx + 1, G0 - 7, 1, 6, b); r(sx + 6, G0 - 7, 1, 6, b)
      r(sx + 2, G0 - 6, 4, 4, a)
      break
    case 'nebula': r(sx, G0 - 8, 8, 5, a); r(sx + 2, G0 - 7, 4, 3, b); break
  }
}
