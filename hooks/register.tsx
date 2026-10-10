import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { EngineInterface } from 'claude-code'
import type { Cell, Lang, Meter, Run, Scene } from '../types'
import { fill, fromSetting, fromText, setLang, tr, W } from './i18n'
import * as lineland from './lineland'
import { THEMES, themeOf } from './themes'

// retro menu palette: warm grey paper, dark ink
const INK = '#4e4b42'
const RED = '#b2533e'
const AMBER = '#c8901e'
// Text follows the person's light or dark theme through the theme key; the panel bodies are a warm
// translucent tint over whatever the app draws beneath, so they read as #f5f2e8 paper on the light
// theme's near-white and as a dark warm brown on the dark theme. The API says nothing of which
// theme is up, so the colours carry both instead of detecting one.
const TEXT = 'text'
// title bars take the theme's text colour as their ground and its inverse for their letters: a dark
// bar on the light theme, a light one on the dark theme, either way well apart from the body
const BAR = 'text'
const BAR_TEXT = 'inverseText'
const READ_BODY = '#c9b98a33'
const PAPER_BODY = '#b5a97759'

const LABEL: Record<string, string> = { five_hour: '5H', seven_day: '7D', spend_limit: 'SPEND' }

const meter = atom({ plugin: 'linecat', key: 'meter' } as const, null)
const open = atom({ plugin: 'linecat', key: 'open' } as const, [] as string[])
const run = atom({ plugin: 'linecat', key: 'run' } as const, { startedAt: 0, seconds: 0, tokens: 0 } as Run)
const line = atom({ plugin: 'linecat', key: 'line' } as const, [] as Cell[])
const scene = atom({ plugin: 'linecat', key: 'scene' } as const, null as Scene | null)
// the Lineland sheet this session drew; kept in session state so a hot reload keeps it
const sheet = atom({ plugin: 'linecat', key: 'theme' } as const, null as string | null)
// the language `auto` settled on this session, kept for the same reason
const settled = atom({ plugin: 'linecat', key: 'lang' } as const, null as Lang | null)

const bar = (pct: number, cells = 12) => {
  const n = Math.max(0, Math.min(cells, Math.round((pct / 100) * cells)))
  return '■'.repeat(n) + '□'.repeat(cells - n)
}

// when a quota window resets, local time; the date too when it is not today (the 7-day window,
// or a 5-hour one past midnight)
const resetAt = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  const isToday = d.toDateString() === new Date().toDateString()
  return 'RESET ' + (isToday ? '' : `${d.getMonth() + 1}/${d.getDate()} `) + hm
}

// a sheet by its id or its name in any language
const sheetNamed = (want: string) =>
  THEMES.find(t => t.id === want || Object.values(t.name).some(n => n.toLowerCase() === want))

type Rec = Record<string, unknown>

// one line saying what a call touched: the command, path or pattern
const brief = (input: unknown) => {
  const i = (input ?? {}) as Rec
  return String(i.command ?? i.file_path ?? i.pattern ?? i.path ?? i.url ?? i.description ?? '').split('\n')[0]!.slice(0, 160)
}

// first lines of a plain-text result (Bash stdout, string results); other shapes show nothing
const peek = (output: unknown) => {
  const o = typeof output === 'string' ? output : (output as Rec | undefined)?.stdout
  return typeof o === 'string' ? o.trim().split('\n').slice(0, 4).join('\n') : ''
}

const status = (c: { isRunning: boolean; isErrored: boolean; isInterrupted: boolean }) =>
  c.isRunning ? 'RUNNING' : c.isInterrupted ? 'ABORTED' : c.isErrored ? 'ERROR' : ''

// a solid title bar over a panel
function titleBar(ui: { Box: any; Text: any }, t: string) {
  const { Box, Text } = ui
  return (
    <Box backgroundColor={BAR} paddingX={2}>
      <Text color={BAR_TEXT} bold>{t}</Text>
    </Box>
  )
}

// the /lineland command, described in the language now in use
const registerCommand = ($: EngineInterface) =>
  $.command.register({
    name: 'lineland',
    description: tr(W.command.description),
    argumentHint: '[' + THEMES.map(t => tr(t.name)).join('|') + '] [lang zh|ja|en|auto] [monitor|panels on|off] [place band|pane]',
    immediate: true,
  })

// whether the language is known: picked in the settings, or settled by auto
let isSettled = false
// where the line is drawn: in the band above the prompt, or in a side pane of its own
const PANE = 'lineland'
let place: 'band' | 'pane' = 'band'

async function settle($: EngineInterface, l: Lang) {
  isSettled = true
  setLang(l)
  await update($, settled, () => l)
  await registerCommand($)
}

// /lineland lang <zh|ja|en|auto>: pick the language here. It is kept past this session in the
// mod's own store, which works however the mod was loaded; the plugin's Language row in /config is
// moved too where there is one (an installed plugin has it, a --plugin-dir or mods-folder one not)
async function switchLang($: EngineInterface, want: string): Promise<string> {
  const isAuto = want.trim().toLowerCase() === 'auto'
  const l = isAuto ? null : fromSetting(want)
  if (!isAuto && !l) return fill(W.lang.unknown, { want: want.trim() })
  // why the store refused, shown with the "this session only" note so it can be told apart
  let whyUnsaved = ''
  try {
    await $.store.set('language', l ?? 'auto')
  } catch (err) {
    whyUnsaved = (err instanceof Error ? err.message : String(err)).slice(0, 120) || 'unknown'
  }
  const row = (await $.config.list()).find(r => r.provider.plugin === 'linecat' && /language/i.test(r.key))
  if (row) await $.config.set({ key: row.key, value: l ?? 'auto' })
  if (l) await settle($, l)
  else {
    isSettled = false
    await update($, settled, () => null)
    await settleFromConfig($)
  }
  return tr(l ? W.lang.set : W.lang.auto) + (whyUnsaved ? ` ${tr(W.lang.unsaved)} [${whyUnsaved}]` : '')
}

// auto: Claude Code's own response-language setting, if it has a row for one
async function settleFromConfig($: EngineInterface) {
  const rows = await $.config.list()
  const found = rows
    .filter(r => /language/i.test(r.key) && r.provider.plugin === 'engine')
    .map(r => fromSetting(r.value))
    .find(Boolean)
  if (found) await settle($, found)
}

export const register: Register = (on, options) => {
  let walker: { cancel: () => void } | undefined
  // whether a main-thread turn runs, so a compaction knows what to go back to
  let isTurnOn = false
  // the language setting: a fixed pick, or null for auto until something settles it
  const picked = fromSetting(options.language)
  isSettled = picked !== null
  if (picked) setLang(picked)
  // the two halves a person may not want: the usage meter, and the restyled transcript. Off in the
  // settings is off; on there, a choice made with /lineland monitor|panels (kept in the store) decides
  const isMonitorAllowed = options.monitor !== false
  const isRestyleAllowed = options.restyle !== false
  let isMonitorOn = isMonitorAllowed
  let isRestyleOn = isRestyleAllowed

  on('session.start', async ($, e, next) => {
    isMonitorOn = isMonitorAllowed && (await $.store.get('monitor')) !== false
    isRestyleOn = isRestyleAllowed && (await $.store.get('restyle')) !== false
    // pane in the settings is pane; otherwise a choice made with /lineland place (in the store)
    place = options.place === 'pane' || (await $.store.get('place')) === 'pane' ? 'pane' : 'band'
    const u = await $.session.usage()
    await update($, meter, (m): Meter => ({ limits: u.rateLimits.length ? u.rateLimits : m?.limits ?? [], ctx: u.context.percent ?? m?.ctx }))

    if (!isSettled) {
      const stored = fromSetting(await $.store.get('language'))
      if (stored) await settle($, stored)
    }
    if (!isSettled) {
      const kept = await read($, settled)
      if (kept) {
        isSettled = true
        setLang(kept)
      } else await settleFromConfig($)
    }

    // a new session draws a sheet at random; a reload keeps the one it drew
    let id = await read($, sheet)
    if (!id) {
      const pick = THEMES[Math.floor(Math.random() * THEMES.length)]!
      id = pick.id
      await update($, sheet, () => pick.id)
      lineland.say(pick.intro)
    }
    lineland.load(await read($, line), id)
    await registerCommand($)
    if (place === 'pane') void $.ui.open({ id: PANE, title: tr(W.place.title) })
    walker?.cancel()
    // ponytail: ticks whether or not the band shows; gate it if it ever costs
    walker = $.clock.every(1000 / lineland.FPS, () => {
      const isGrown = lineland.tick(1 / lineland.FPS)
      void (async () => {
        if (isGrown) await update($, line, () => [...lineland.cells()])
        await update($, scene, () => lineland.scene())
      })()
    })
    return next(e)
  })

  // /lineland [sheet]: the same line redrawn on another sheet, a named one or any other at random
  on('command.run', { command: 'lineland' }, async ($, e) => {
    const [head = '', ...rest] = e.args.trim().split(/\s+/)
    if (/^(lang|language|语言|語言|言語)$/i.test(head)) return { text: await switchLang($, rest.join(' ')) }
    // /lineland place band|pane: the line in the band, or in a side pane that no other plugin contends for
    if (/^(place|where|位置)$/i.test(head)) {
      const v = (rest[0] ?? '').toLowerCase()
      if (v !== 'band' && v !== 'pane') return { text: tr(W.place.which) }
      await $.store.set('place', v)
      if (v === 'band' && options.place === 'pane') return { text: tr(W.place.band) + ' ' + tr(W.place.pinned) }
      place = v
      if (v === 'pane') await $.ui.open({ id: PANE, title: tr(W.place.title) })
      else await $.ui.close({ id: PANE })
      $.ui.invalidate('ui.render')
      return { text: tr(v === 'pane' ? W.place.pane : W.place.band) }
    }
    // /lineland monitor on|off, /lineland panels on|off: kept in the store like the language
    const which = /^(monitor|meter)$/i.test(head) ? 'monitor' : /^(panels?|restyle)$/i.test(head) ? 'restyle' : null
    if (which) {
      const v = (rest[0] ?? '').toLowerCase()
      const isOn = v === 'on' ? true : v === 'off' ? false : null
      if (isOn === null) return { text: fill(W.toggle.which, { what: which === 'monitor' ? 'monitor' : 'panels' }) }
      await $.store.set(which, isOn)
      const isAllowed = which === 'monitor' ? isMonitorAllowed : isRestyleAllowed
      if (which === 'monitor') isMonitorOn = isOn && isAllowed
      else isRestyleOn = isOn && isAllowed
      $.ui.invalidate('ui.render')
      const said = which === 'monitor' ? (isOn ? W.toggle.monitorOn : W.toggle.monitorOff) : isOn ? W.toggle.panelsOn : W.toggle.panelsOff
      return { text: tr(said) + (isOn && !isAllowed ? ' ' + tr(W.toggle.settings) : '') }
    }
    const want = e.args.trim().replace(/^\[|\]$/g, '').trim().toLowerCase()
    const current = await read($, sheet)
    const others = THEMES.filter(t => t.id !== current)
    const pick = want ? sheetNamed(want) : others[Math.floor(Math.random() * others.length)]
    if (!pick) {
      return { text: fill(W.command.unknown, { want: e.args.trim(), all: THEMES.map(t => tr(t.name)).join(' / ') }) }
    }
    await update($, sheet, () => pick.id)
    lineland.setTheme(pick.id)
    lineland.say(pick.intro)
    return { text: fill(W.command.switched, { name: tr(pick.name) }) }
  })

  // Lineland: every tool call grows the line; the main thread's calls also set what the character
  // wears overhead (a subagent's calls run under the main thread's Agent call)
  on('tool.call', async ($, e, next) => {
    const isMain = !e.agentId
    if (isMain) lineland.setStatus('tool', e.tool)
    // the land grows as the call starts, so the narration matches what runs; a failure tears a rift after it
    lineland.grow(e.tool, false)
    await update($, line, () => [...lineland.cells()])
    const r = await next(e)
    const isDenied = Boolean(r.deny)
    if (isDenied || r.isError) lineland.grow(e.tool, true)
    if (isMain) {
      lineland.setStatus(isTurnOn ? 'requesting' : 'idle')
      if (isDenied) lineland.flash('denied', e.tool)
      else if (r.isError) lineland.flash('error', e.tool, 4)
    }
    await update($, line, () => [...lineland.cells()])
    return r
  })

  // the permission dialog is up. Observe only: the event goes on untouched and the decision stays
  // the person's; nothing here reads or answers it.
  // ponytail: the mark stays up through the approved call's run too; no event marks the answer
  on('classic.PermissionRequest', ($, e, next) => {
    if (!e.agent_id) lineland.setStatus('permission', e.tool_name)
    return next(e)
  })

  on('session.compact', async ($, e, next) => {
    if (e.agentId) return next(e)
    lineland.setStatus('compact')
    try {
      return await next(e)
    } finally {
      lineland.setStatus(isTurnOn ? 'requesting' : 'idle')
    }
  })

  on('prompt.submit', async ($, e, next) => {
    lineland.flash('prompt', '', 1.5)
    // auto, with nothing settled yet: the script of the person's first prompt. Prompts a program
    // made (a task notification, a channel message) open with a tag and are passed over.
    if (!isSettled && !e.text.trimStart().startsWith('<')) {
      const found = fromText(e.text)
      if (found) await settle($, found)
    }
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, meter, (): Meter => ({ limits: e.rateLimits, ctx: e.context.percent }))
    return next(e)
  })

  // the STANDBY column: the line, its title bar and the status footer; drawn in the band or the pane
  function standby(ui: ReturnType<EngineInterface['ui']['resolve']>, sc: Scene) {
    const { Box, Text } = ui
    return (
      <Box flexDirection="column" flexGrow={1}>
        {titleBar(ui, 'STANDBY // ' + tr(themeOf(sc.theme).name))}
        {'Svg' in ui ? <ui.Svg source={lineland.draw(sc)} alt="Lineland" /> : null}
        <Box flexGrow={1} />
        <Box justifyContent="center">
          <Text
            color={sc.status === 'error' || sc.status === 'denied' ? RED : sc.status === 'permission' ? AMBER : TEXT}
            dimColor={sc.status === 'idle'}
            wrap="truncate-end"
          >
            {sc.said ? sc.label + ' · ' + sc.said : sc.label}
          </Text>
        </Box>
      </Box>
    )
  }

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // what the plugins beneath drew here: kept and shown with ours, never swallowed, so another
    // plugin's band survives beside this one
    const below = await next(e)
    if (e.props.hasSurvey) return below
    const m = await read($, meter)
    const ui = $.ui.resolve(e)
    const sc = place === 'band' && 'Svg' in ui ? await read($, scene) : null
    const hasMonitor = isMonitorOn && m !== null
    // nothing of ours to draw: the line elsewhere or not drawable here, and no monitor
    if (!sc && !hasMonitor) return below

    const { Box, Text } = ui
    const rows = !m ? [] : [
      ...m.limits.map(l => ({ label: LABEL[l.kind] ?? l.kind.toUpperCase(), pct: l.percentUsed, tail: resetAt(l.resetsAt) })),
      ...(m.ctx === undefined ? [] : [{ label: 'CTX', pct: m.ctx, tail: '' }]),
    ]

    const ours = (
      // both halves start from zero width and split the row 6:4, whatever their content: the usage
      // half is narrow until the quota windows arrive, and would otherwise cede room
      <Box flexDirection="row" gap={1}>
        {sc ? (
          <Box flexDirection="column" flexGrow={3} width={0}>
            {standby(ui, sc)}
          </Box>
        ) : null}
        {hasMonitor ? (
          <Box flexDirection="column" flexGrow={2} width={0}>
            {titleBar(ui, 'RESOURCE MONITOR')}
            {rows.length === 0 ? (
              <Box paddingX={2} paddingY={1}>
                <Text color={TEXT}>NO DATA. AWAITING FIRST RESPONSE.</Text>
              </Box>
            ) : (
              // one column each for label, bar, percentage and reset, so they line up in any font
              <Box flexDirection="row" gap={1} paddingX={1} paddingY={1}>
                {[
                  (r: (typeof rows)[number]) => r.label,
                  (r: (typeof rows)[number]) => bar(r.pct),
                  (r: (typeof rows)[number]) => Math.round(r.pct) + '%',
                  (r: (typeof rows)[number]) => r.tail || ' ',
                ].map((cell, k) => (
                  <Box key={'c' + k} flexDirection="column" alignItems={k === 2 ? 'flex-end' : 'flex-start'}>
                    {rows.map(r => (
                      <Text key={r.label} color={r.pct >= 80 ? RED : TEXT} wrap="truncate-end">
                        {cell(r)}
                      </Text>
                    ))}
                  </Box>
                ))}
              </Box>
            )}
            <Box flexGrow={1} />
            <Box justifyContent="center">
              <Text color={TEXT} dimColor>NO ERROR</Text>
            </Box>
          </Box>
        ) : null}
      </Box>
    )
    return below ? (
      <Box flexDirection="column">
        {below}
        {ours}
      </Box>
    ) : (
      ours
    )
  })

  // the line in a side pane of its own, when placed there
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const sc = 'Svg' in ui ? await read($, scene) : null
    if (!sc) return <ui.Text dimColor>{tr(W.place.desktopOnly)}</ui.Text>
    return standby(ui, sc)
  })

  // our own turn clock: the desktop keeps its seconds and tokens to itself
  let tick: { cancel: () => void } | undefined

  on('turn.start', async ($, e, next) => {
    isTurnOn = true
    lineland.setStatus('requesting')
    const startedAt = await $.clock.now()
    await update($, run, (): Run => ({ startedAt, seconds: 0, tokens: 0 }))
    tick?.cancel()
    tick = $.clock.every(1000, () => {
      void $.clock.now().then(now => update($, run, r => ({ ...r!, seconds: Math.floor((now - r!.startedAt) / 1000) })))
    })
    return next(e)
  })

  on('turn.complete', (_$, e, next) => {
    if (e.agentId) return next(e)
    isTurnOn = false
    lineland.setStatus('idle')
    if (e.isAborted) lineland.flash('interrupted', '', 3)
    tick?.cancel()
    tick = undefined
    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!isRestyleOn || e.surface !== 'desktop') return next(e)

    const { Text } = $.ui.resolve(e)
    const r = await read($, run)
    const tokens = r.tokens > 0 ? '  ·  ' + r.tokens.toLocaleString() + ' tokens' : ''
    return <Text color={TEXT} bold>{'■ PROCESSING  ' + r.seconds + 's' + tokens}</Text>
  })

  // the main thread's stream: thinking, writing the reply, or writing a tool call's input
  on('turn.step', async function* ($, e, next) {
    const s = next(e)
    for await (const c of s) {
      if (!e.agentId) {
        if (c.kind === 'thinking') lineland.setStatus('thinking')
        else if (c.kind === 'text') lineland.setStatus('responding')
        else if (c.kind === 'tool') lineland.setStatus('preparing', c.name)
      }
      yield c
    }
    const r = await s.result
    const out = r.usage?.output_tokens ?? 0
    if (out) await update($, run, x => ({ ...x!, tokens: x!.tokens + out }))
    return r
  })

  // tool rows: a dark edge bar, the tool name, what it touched
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!isRestyleOn) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    // the first row of a group we expanded carries the group's FOLD button
    const id = e.props.tool_use_id
    const isGroupHead = (await read($, open)).includes(id)
    const st = status(e.props)
    const out = e.props.isRunning ? '' : peek(e.props.output)
    return (
      <Box flexDirection="row" backgroundColor={READ_BODY}>
        <Box backgroundColor={st === 'ERROR' ? RED : INK}><Text> </Text></Box>
        <Box flexDirection="column" paddingX={1} flexGrow={1}>
          <Box flexDirection="row" gap={1}>
            <Text color={TEXT} bold>{e.props.tool.toUpperCase()}</Text>
            <Text color={TEXT} wrap="truncate-end">{brief(e.props.input)}</Text>
            {st ? <Text color={st === 'RUNNING' ? TEXT : RED} bold>{st}</Text> : null}
            {isGroupHead ? (
              <Button key="fold" label="FOLD" plain onPress={() => update($, open, l => (l ?? []).filter(x => x !== id))} />
            ) : null}
          </Box>
          {out ? <Text color={TEXT} dimColor>{out}</Text> : null}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    if (!isRestyleOn) return next(e)
    const id = e.props.calls[0]?.tool_use_id
    if (e.props.isExpanded || (id && (await read($, open)).includes(id))) {
      return next({ ...e, props: { ...e.props, isExpanded: true } })
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const counts = new Map<string, number>()
    for (const c of e.props.calls) counts.set(c.tool, (counts.get(c.tool) ?? 0) + 1)
    const summary = [...counts].map(([t, n]) => t.toUpperCase() + ' ×' + n).join('  ')
    const isErrored = e.props.calls.some(c => c.isErrored)
    return (
      <Box flexDirection="row" alignItems="center" backgroundColor={READ_BODY}>
        <Box backgroundColor={isErrored ? RED : INK}><Text> </Text></Box>
        <Box flexDirection="row" gap={1} paddingX={1} flexGrow={1}>
          <Text color={TEXT} bold>EXECUTE</Text>
          <Text color={TEXT}>{summary + (e.props.isActive ? '  ...' : '')}</Text>
        </Box>
        {id ? <Button key="expand" label="EXPAND" plain onPress={() => update($, open, l => [...(l ?? []), id])} /> : null}
      </Box>
    )
  })

  // transcript: paper panels, dark title bar over a light paper body
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    if (!isRestyleOn) return next(e)
    const { Box, Markdown, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column" backgroundColor={READ_BODY}>
        {e.props.isFirstOfReply ? (
          <Box backgroundColor={BAR} paddingX={2}>
            <Text color={BAR_TEXT} bold>REPORT</Text>
          </Box>
        ) : null}
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Markdown text={e.props.text} />
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'UserMessage' }, ($, e, next) => {
    if (!isRestyleOn || e.props.from || e.props.task || !e.props.text) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column" backgroundColor={PAPER_BODY}>
        <Box backgroundColor={BAR} paddingX={2}>
          <Text color={BAR_TEXT} bold>INPUT</Text>
        </Box>
        <Box paddingX={2} paddingY={1}>
          <Text color={TEXT}>{e.props.text}</Text>
        </Box>
      </Box>
    )
  })
}
