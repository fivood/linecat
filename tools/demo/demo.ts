// Plays a scripted session through linecat's own lineland.ts and writes the band, frame by frame, to a GIF.
// usage, from this folder: npm install, then npm run gif (docs/demo.gif) and npm run gif:zh (docs/demo-zh.gif)
import { writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import { GIFEncoder, applyPalette, quantize } from 'gifenc'
import * as L from '../../hooks/lineland'
import { setLang, tr } from '../../hooks/i18n'
import { themeOf } from '../../hooks/themes'

const [out = 'demo.gif', lang = 'en'] = process.argv.slice(2)
setLang(lang as 'en')

// seeded wandering so every run draws the same walk
let seed = 7
Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

const S = 3, AW = 200 * S, AH = 56 * S, BAR = 34, FOOT = 34, PAD = 10
const WIDTH = AW + PAD * 2, HEIGHT = BAR + AH + FOOT + PAD
const INK = '#4e4b42', PAPER = '#f2eee2', RED = '#b2533e', AMBER = '#c8901e'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const FONT = `font-family="Consolas, 'Microsoft YaHei', 'Yu Gothic', monospace" font-weight="bold"`

// what happens, second by second
const at: [number, () => void][] = [
  [0.2, () => { L.flash('prompt', '', 1.5); L.setStatus('requesting') }],
  [1.4, () => L.setStatus('thinking')],
  [3.2, () => L.setStatus('preparing', 'Read')],
  [3.8, () => { L.setStatus('tool', 'Read'); L.grow('Read', false) }],
  [5.0, () => { L.setStatus('tool', 'Grep'); L.grow('Grep', false) }],
  [6.2, () => { L.setStatus('tool', 'Bash'); L.grow('Bash', false) }],
  [8.0, () => L.setStatus('permission', 'Edit')],
  [9.6, () => { L.setStatus('tool', 'Edit'); L.grow('Edit', false) }],
  [11.0, () => { L.setStatus('tool', 'Bash'); L.grow('Bash', false) }],
  [12.0, () => { L.grow('Bash', true); L.setStatus('requesting'); L.flash('error', 'Bash', 2) }],
  [14.0, () => { L.setStatus('tool', 'Edit'); L.grow('Edit', false) }],
  [15.2, () => L.setStatus('responding')],
  [17.0, () => L.setStatus('idle')],
  // /lineland: the same line on other sheets
  ...['dune', 'pcb', 'ink', 'blueprint', 'sky'].map((id, k): [number, () => void] =>
    [18 + k * 1.6, () => { L.setTheme(id); L.say(themeOf(id).intro) }]),
]
const SECONDS = 26

L.load([], 'earth')
L.say(themeOf('earth').intro)
const gif = GIFEncoder()
const dt = 1 / L.FPS
for (let f = 0, ev = 0; f < SECONDS * L.FPS; f++) {
  const t = f * dt
  while (ev < at.length && at[ev]![0] <= t) at[ev++]![1]()
  L.tick(dt)
  const sc = L.scene()
  const art = L.draw(sc).replace('width="300" height="84"', `x="${PAD}" y="${BAR}" width="${AW}" height="${AH}"`)
  const color = sc.status === 'error' || sc.status === 'denied' ? RED : sc.status === 'permission' ? AMBER : INK
  const foot = sc.said ? sc.label + ' · ' + sc.said : sc.label
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
<rect width="100%" height="100%" fill="${PAPER}"/>
<rect x="${PAD}" y="${PAD}" width="${AW}" height="${BAR - PAD - 2}" fill="${INK}"/>
<text x="${PAD + 12}" y="${BAR - 10}" font-size="15" fill="${PAPER}" ${FONT}>${esc('STANDBY // ' + tr(themeOf(sc.theme).name))}</text>
${art}
<text x="${WIDTH / 2}" y="${BAR + AH + 22}" font-size="14" text-anchor="middle" fill="${color}" ${FONT} opacity="${sc.status === 'idle' ? 0.6 : 1}">${esc(foot.length > 78 ? foot.slice(0, 77) + '…' : foot)}</text>
</svg>`
  const png = new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Consolas' } }).render()
  const rgba = new Uint8Array(png.pixels)
  const palette = quantize(rgba, 128)
  gif.writeFrame(applyPalette(rgba, palette), png.width, png.height, { palette, delay: 1000 / L.FPS })
}
gif.finish()
writeFileSync(out, gif.bytes())
console.log(out, (gif.bytes().length / 1024).toFixed(0) + ' KB', WIDTH + 'x' + HEIGHT)
