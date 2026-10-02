# Aseprite sheet + json -> hooks/cats.ts: one animated pixel-rect SVG per frame tag
import json, sys
from PIL import Image
png, js, out = sys.argv[1:4]
sheet = Image.open(png).convert('RGBA'); px = sheet.load()
d = json.load(open(js, encoding='utf-8'))
frames = d['frames'] if isinstance(d['frames'], list) else list(d['frames'].values())

# per-tag slowdown: the export's 100ms frames breathe too fast
SLOW = {'idle': 6, 'sleep': 9}

def svg(ids, slow=1):
    fs = [frames[i] for i in ids]
    w, h = fs[0]['frame']['w'], fs[0]['frame']['h']
    total = sum(f['duration'] for f in fs) * slow
    t, kt = 0, []
    for f in fs:
        kt.append(f'{t / total:.4f}'); t += f['duration'] * slow
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 {w} {h}" shape-rendering="crispEdges">']
    for i, f in enumerate(fs):
        fx, fy = f['frame']['x'], f['frame']['y']
        vals = ';'.join('1' if j == i else '0' for j in range(len(fs)))
        o.append(f'<g opacity="{1 if i == 0 else 0}"><animate attributeName="opacity" values="{vals}" keyTimes="{";".join(kt)}" calcMode="discrete" dur="{total / 1000}s" repeatCount="indefinite"/>')
        for y in range(h):
            x = 0
            while x < w:
                c = px[fx + x, fy + y]
                if c[3] < 128:
                    x += 1; continue
                x0 = x
                while x < w and px[fx + x, fy + y] == c:
                    x += 1
                o.append(f'<rect x="{x0}" y="{y}" width="{x - x0}" height="1" fill="#{c[0]:02x}{c[1]:02x}{c[2]:02x}"/>')
        o.append('</g>')
    return ''.join(o) + '</svg>'

lines = ['// Generated from sem_cat.aseprite export (sprites_small/cat). One SVG per frame tag.', 'export const CATS = {']
for t in d['meta']['frameTags']:
    lines.append(f"  {t['name']}: '{svg(range(t['from'], t['to'] + 1), SLOW.get(t['name'].split('_')[0], 1))}',")
lines.append('} as const')
open(out, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
