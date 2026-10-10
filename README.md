# 线国猫 Linecat

English · [中文](README.zh-CN.md)

A Claude Code mod (function-hook plugin) for the desktop Code tab. A pixel cat lives in a strip above the prompt, walking a line that your session unfolds as it works, and wearing what Claude is doing over its head. The rest of the tab gets a retro game-menu look: paper panels under solid title bars, in both the light and the dark theme.

- **Messages**: your prompts and Claude's replies drawn as panels with a title bar (`INPUT` / `REPORT`) and square corners. The bodies are a warm translucent tint and the text and title bars use the theme's own colours, so the light theme gets paper panels with dark bars and the dark theme dark warm panels with light bars, with no setting to change.
- **Band above the prompt**, two panels side by side, 6:4:
  - **STANDBY**: Lineland, after the desktop pet of [A Visitor from the Fourth Dimension](https://github.com/fivood/claudewant). One line of paper that the session unfolds: reads pool into water, commands push up mountains, edits grow trees, errors tear rifts. A pixel character (a cat by default) wanders it, climbs the mountains, hops the rifts, and curls up after two quiet minutes.
    - **The sheet** is one of the game's ten, drawn at random when a session starts (a hot reload keeps it): Earthlike, Dual-Vector Foil, Dune, Solaris, Crystallized, Circuit Board, Ink Wash, Blueprint, Tissue Slide, Deep Sky. Each has its own colours, its own mountains and woods, and one motion of its own: drifting clouds, a flattening aftershock, a sandworm under the line, two suns, a drifting glint, a data packet on the trace, distant hills, the plan's grid, drifting nuclei, twinkling stars and meteors. `/lineland` redraws the same line on another sheet at random, `/lineland 沙丘` (or `/lineland dune`) on that one; it works mid-turn too.
    - **What Claude Code is doing** shows over the character's head, drawn with a thin light outline so it reads on any background, and in the footer:

      | State | Over its head | Footer |
      |---|---|---|
      | prompt sent | `!` | `INPUT RECEIVED` |
      | waiting on the model | signal bars | `CONNECTING` |
      | thinking (back turned) | three dots lighting up | `ANALYZING` |
      | writing the reply | lines typing out | `TRANSMITTING` |
      | writing a tool call | that tool's icon, blinking | `PREPARING: <tool>` |
      | a tool running | page, magnifier, terminal, pencil, globe, branch (subagent), checklist, plug (MCP), spark (skill), gear | `EXECUTE: <tool>` |
      | permission dialog up | amber `?` | `AWAITING AUTHORIZATION: <tool>` |
      | tool failed / denied | red `!` / red `×` | `ERROR` / `DENIED` |
      | turn interrupted | `■` | `INTERRUPTED` |
      | compacting | hourglass | `COMPRESSING MEMORY` |
      | idle two minutes | z z z | `SLEEP MODE` |

      Subagents' own steps and calls do not change it; their parent `Agent` call shows instead.
  - **RESOURCE MONITOR**: 5-hour / 7-day quota and context fill as `■□` bars in aligned columns, each with when it resets (`RESET 20:00`, or `RESET 10/13 20:00` when that is not today).
- **Language**: the narration, the sheets' names and intros and the `/lineland` replies come in 中文, 日本語 and English. The **Language** setting (in `/config`, or asked at install) picks one, or `auto`: Claude Code's own response-language setting when it has one, otherwise the script of your first prompt. The status labels (`EXECUTE`, `ANALYZING`…) stay English on purpose, as part of the look.
- **Spinner**: `■ PROCESSING  12s  ·  340 tokens`.
- **Tool rows**: dark edge bar, tool name, what it touched, status and the first lines of plain-text output.

The character is pixel art kept as readable rows of letters, one per colour (`hooks/sprite.ts`), turned into SVG rects when the mod loads; `sheet2ts.py` writes that file from an Aseprite sprite-sheet export.

## Install

At the prompt of a terminal `claude` session:

```
/plugin install linecat --marketplace fivood/linecat
```

Answer `y` to add the marketplace, then pick a scope (user scope is first). Installed at user scope, it also loads in the desktop app's Code tab, which is where the cat and the sheets are drawn; a terminal session gets the panels and the usage bars but not the SVG strip.

To work on it from a clone instead, point Claude Code at the folder in `~/.claude/settings.json`:

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "C:\\path\\to\\linecat" } }
```

Or for one session: `claude --plugin-dir /path/to/linecat`.

## What it reads and sends

It only draws. It reads the session's own usage figures (quota windows and context fill), the names and inputs of tool calls as they run, the stream's phase (thinking, reply, tool input), when a permission dialog opens, compaction and turn ends, and keeps a small amount of session state (the line, the chosen sheet, a turn clock). It sends nothing anywhere, makes no network requests, reads and writes no files, and runs no processes. Its hooks on tool calls, permission checks, prompts, the stream, compaction and turns only observe: each passes its event on unchanged, so no call, prompt or permission decision is altered. Only its drawing hooks replace what the app draws, and only on screen; the transcript Claude reads is untouched.

**The permission hook.** One hook runs when Claude Code opens a permission dialog (`PermissionRequest`). It only puts the amber `?` over the cat and writes `AWAITING AUTHORIZATION` in the footer, then hands the event on unchanged. It never reads, changes or answers the decision: approving or denying stays entirely yours.

**The tool-call hook.** The `tool.call` hook sees every tool call, including calls made by other code, so the line can grow and the cat can show the tool's icon. It passes each call on unchanged and only reads its name and whether it failed or was denied.

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

Code: MIT. The pixel-cat artwork in `hooks/sprite.ts` and `.claude-plugin/icon.png` is not covered by the MIT license, all rights reserved; see [LICENSE](LICENSE).

## Limits

The desktop app's own background, the grey frame around the band, its per-turn "Ran a command…" fold and system notices are not hookable, so they keep the app's look.
