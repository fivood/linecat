# nier-ui

A Claude Code mod (function-hook plugin) that restyles the desktop Code tab after the *NieR:Automata* menus.

- **Messages**: your prompts and Claude's replies drawn as NieR panels — dark title bar (`INPUT` / `REPORT`), light paper body, square corners.
- **Usage band** above the prompt: 5-hour / 7-day quota and context fill as `■□` bars, with an animated pixel cat whose pose follows what Claude is doing (thinking, writing, running tools, asleep when idle).
- **Spinner**: `■ PROCESSING  12s  ·  340 tokens`.
- **Tool rows**: dark edge bar, tool name, what it touched, status and the first lines of plain-text output.

The cat is drawn as pixel rects in SVG (`hooks/cats.ts`), generated from an Aseprite sprite-sheet export by `sheet2ts.py`.

## Install

Clone it anywhere, then point Claude Code at the folder in `~/.claude/settings.json`:

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "C:\\path\\to\\nier-ui" } }
```

Or for one session: `claude --plugin-dir /path/to/nier-ui`.

## Swap the cat

Export your sprite as a sheet + JSON from Aseprite (frame tags `idle_front`, `idle_back`, `walk_front`, `walk_back`, `sleep_front`), then:

```
python sheet2ts.py sheet.png sheet.json hooks/cats.ts
```

Requires Pillow.

## License

Code: MIT. The pixel-cat artwork in `hooks/cats.ts` is not covered by the MIT license, all rights reserved; see [LICENSE](LICENSE).

## Limits

The desktop app's own background, the grey frame around the band, its per-turn "Ran a command…" fold and system notices are not hookable, so they keep the app's look.
