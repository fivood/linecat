# nier-ui

A Claude Code mod (function-hook plugin) that restyles the desktop Code tab after the *NieR:Automata* menus.

- **Messages**: your prompts and Claude's replies drawn as NieR panels — dark title bar (`INPUT` / `REPORT`), light paper body, square corners.
- **Band above the prompt**, two panels:
  - **STANDBY**: Lineland, after the desktop pet of [A Visitor from the Fourth Dimension](https://github.com/fivood/claudewant). One line of paper that the session unfolds: reads pool into water, commands push up mountains, edits grow trees, errors tear rifts. A pixel character (a cat by default) wanders it, climbs the mountains, hops the rifts, and curls up after two quiet minutes.
    - **The sheet** is one of the game's ten, drawn at random when a session starts (a hot reload keeps it): Earthlike, Dual-Vector Foil, Dune, Solaris, Crystallized, Circuit Board, Ink Wash, Blueprint, Tissue Slide, Deep Sky. Each has its own colours, its own mountains and woods, and one motion of its own: drifting clouds, a flattening aftershock, a sandworm under the line, two suns, a drifting glint, a data packet on the trace, distant hills, the plan's grid, drifting nuclei, twinkling stars and meteors. `/lineland` redraws the same line on another sheet at random, `/lineland 沙丘` (or `/lineland dune`) on that one; it works mid-turn too.
    - **What Claude Code is doing** shows over the character's head and in the footer:

      | State | Over its head | Footer |
      |---|---|---|
      | prompt sent | `!` | `INPUT RECEIVED` |
      | waiting on the model | signal bars | `CONNECTING` |
      | thinking (back turned) | thought bubble, dots | `ANALYZING` |
      | writing the reply | lines typing out | `TRANSMITTING` |
      | writing a tool call | that tool's icon, blinking | `PREPARING: <tool>` |
      | a tool running | page, magnifier, terminal, pencil, globe, branch (subagent), checklist, plug (MCP), spark (skill), gear | `EXECUTE: <tool>` |
      | permission dialog up | amber `?` | `AWAITING AUTHORIZATION: <tool>` |
      | tool failed / denied | red `!` / red `×` | `ERROR` / `DENIED` |
      | turn interrupted | `■` | `INTERRUPTED` |
      | compacting | hourglass | `COMPRESSING MEMORY` |
      | idle two minutes | z z z | `SLEEP MODE` |

      Subagents' own steps and calls do not change it; their parent `Agent` call shows instead.
  - **RESOURCE MONITOR**: 5-hour / 7-day quota and context fill as `■□` bars.
- **Spinner**: `■ PROCESSING  12s  ·  340 tokens`.
- **Tool rows**: dark edge bar, tool name, what it touched, status and the first lines of plain-text output.

The character is drawn as pixel rects in SVG (`hooks/sprite.ts`), generated from an Aseprite sprite-sheet export by `sheet2ts.py`.

## Install

Clone it anywhere, then point Claude Code at the folder in `~/.claude/settings.json`:

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "C:\\path\\to\\nier-ui" } }
```

Or for one session: `claude --plugin-dir /path/to/nier-ui`.

## Swap the character

Export your sprite as a sheet + JSON from Aseprite (square frames up to about 32 px), then:

```
python sheet2ts.py sheet.png sheet.json hooks/sprite.ts "Artwork (c) you"
```

Frame tags it uses:

| Tag | When | |
|---|---|---|
| `idle_front` | standing | required; every missing tag falls back to it |
| `idle_back` | Claude is thinking | |
| `walk_front` | walking | |
| `sleep_front` | two quiet minutes | |

Draw the `_front` poses facing right: they are mirrored when the character heads left, and it keeps facing the way it last walked. `_back` poses are never mirrored.

Requires Pillow.

## License

Code: MIT. The pixel-cat artwork in `hooks/sprite.ts` is not covered by the MIT license, all rights reserved; see [LICENSE](LICENSE).

## Limits

The desktop app's own background, the grey frame around the band, its per-turn "Ran a command…" fold and system notices are not hookable, so they keep the app's look.
