import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Meter, Pose, Run } from '../types'
import { CATS } from './cats'

// NieR:Automata palette
const PAPER = '#dad4bb'
const INK = '#4e4b42'
const RED = '#b2533e'
const READ = '#f5f2e8' // light paper for reading, NieR panel body tone

const LABEL: Record<string, string> = { five_hour: '5H', seven_day: '7D', spend_limit: 'SPEND' }
// stream chunk kind -> cat pose while a turn runs
const POSE: Record<string, Pose> = { thinking: 'idle_back', text: 'walk_front', tool: 'walk_back', input: 'walk_back' }

const meter = atom({ plugin: 'nier-ui', key: 'meter' } as const, null)
const open = atom({ plugin: 'nier-ui', key: 'open' } as const, [] as string[])
const run = atom({ plugin: 'nier-ui', key: 'run' } as const, { startedAt: 0, seconds: 0, tokens: 0 } as Run)
const pose = atom({ plugin: 'nier-ui', key: 'pose' } as const, 'idle_front' as Pose)

const bar = (pct: number, cells = 12) => {
  const n = Math.max(0, Math.min(cells, Math.round((pct / 100) * cells)))
  return '■'.repeat(n) + '□'.repeat(cells - n)
}

const hhmm = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return 'RESET ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

type Rec = Record<string, unknown>

// one line saying what a call touched: the command, path or pattern
const brief = (input: unknown) => {
  const i = (input ?? {}) as Rec
  return String(i.command ?? i.file_path ?? i.pattern ?? i.path ?? i.url ?? i.description ?? '').split('\n')[0].slice(0, 160)
}

// first lines of a plain-text result (Bash stdout, string results); other shapes show nothing
const peek = (output: unknown) => {
  const o = typeof output === 'string' ? output : (output as Rec | undefined)?.stdout
  return typeof o === 'string' ? o.trim().split('\n').slice(0, 4).join('\n') : ''
}

const status = (c: { isRunning: boolean; isErrored: boolean; isInterrupted: boolean }) =>
  c.isRunning ? 'RUNNING' : c.isInterrupted ? 'ABORTED' : c.isErrored ? 'ERROR' : ''

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const u = await $.session.usage()
    await update($, meter, (): Meter => ({ limits: u.rateLimits, ctx: u.context.percent }))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, meter, (): Meter => ({ limits: e.rateLimits, ctx: e.context.percent }))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const m = await read($, meter)
    if (e.props.hasSurvey || m === null) return next(e)

    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const rows = [
      ...m.limits.map(l => ({ label: LABEL[l.kind] ?? l.kind.toUpperCase(), pct: l.percentUsed, tail: hhmm(l.resetsAt) })),
      ...(m.ctx === undefined ? [] : [{ label: 'CTX', pct: m.ctx, tail: '' }]),
    ]

    return (
      <Box flexDirection="column">
        <Box backgroundColor={INK} paddingX={2}>
          <Text color={PAPER} bold>RESOURCE MONITOR</Text>
        </Box>
        <Box flexDirection="row" alignItems="center" gap={1} paddingX={2}>
          {'Svg' in ui ? (
          <ui.Svg source={CATS[e.props.isWorking ? await read($, pose) : 'sleep_front']} alt="pixel cat" width={64} height={64} />
        ) : null}
          <Box flexDirection="column">
            {rows.length === 0 ? (
              <Text color={INK}>  NO DATA. AWAITING FIRST RESPONSE.</Text>
            ) : (
              rows.map(r => (
                <Text key={r.label} color={r.pct >= 80 ? RED : INK}>
                  {'  ' + r.label.padEnd(5) + bar(r.pct) + ' ' + String(Math.round(r.pct)).padStart(3) + '%  ' + r.tail}
                </Text>
              ))
            )}
          </Box>
        </Box>
        <Box justifyContent="center">
          <Text color={INK} dimColor>NO ERROR</Text>
        </Box>
      </Box>
    )
  })

  // our own turn clock: the desktop keeps its seconds and tokens to itself
  let tick: { cancel: () => void } | undefined

  on('turn.start', async ($, e, next) => {
    await update($, pose, (): Pose => 'idle_front')
    const startedAt = await $.clock.now()
    await update($, run, (): Run => ({ startedAt, seconds: 0, tokens: 0 }))
    tick?.cancel()
    tick = $.clock.every(1000, () => {
      void $.clock.now().then(now => update($, run, r => ({ ...r!, seconds: Math.floor((now - r!.startedAt) / 1000) })))
    })
    return next(e)
  })

  on('turn.complete', (_$, e, next) => {
    tick?.cancel()
    tick = undefined
    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.surface !== 'desktop') return next(e)

    const { Text } = $.ui.resolve(e)
    const r = await read($, run)
    const tokens = r.tokens > 0 ? '  ·  ' + r.tokens.toLocaleString() + ' tokens' : ''
    return <Text color={INK} bold>{'■ PROCESSING  ' + r.seconds + 's' + tokens}</Text>
  })

  on('turn.step', async function* ($, e, next) {
    let last: Pose | undefined
    const s = next(e)
    for await (const c of s) {
      const p = POSE[c.kind]
      if (p && p !== last) {
        last = p
        await update($, pose, () => p)
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
    const { Box, Button, Text } = $.ui.resolve(e)
    // the first row of a group we expanded carries the group's FOLD button
    const id = e.props.tool_use_id
    const isGroupHead = (await read($, open)).includes(id)
    const st = status(e.props)
    const out = e.props.isRunning ? '' : peek(e.props.output)
    return (
      <Box flexDirection="row" backgroundColor={READ}>
        <Box backgroundColor={st === 'ERROR' ? RED : INK}><Text> </Text></Box>
        <Box flexDirection="column" paddingX={1} flexGrow={1}>
          <Box flexDirection="row" gap={1}>
            <Text color={INK} bold>{e.props.tool.toUpperCase()}</Text>
            <Text color={INK} wrap="truncate-end">{brief(e.props.input)}</Text>
            {st ? <Text color={st === 'RUNNING' ? INK : RED} bold>{st}</Text> : null}
            {isGroupHead ? (
              <Button key="fold" label="FOLD" plain onPress={() => update($, open, l => (l ?? []).filter(x => x !== id))} />
            ) : null}
          </Box>
          {out ? <Text color={INK} dimColor>{out}</Text> : null}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
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
      <Box flexDirection="row" alignItems="center" backgroundColor={READ}>
        <Box backgroundColor={isErrored ? RED : INK}><Text> </Text></Box>
        <Box flexDirection="row" gap={1} paddingX={1} flexGrow={1}>
          <Text color={INK} bold>EXECUTE</Text>
          <Text color={INK}>{summary + (e.props.isActive ? '  ...' : '')}</Text>
        </Box>
        {id ? <Button key="expand" label="EXPAND" plain onPress={() => update($, open, l => [...(l ?? []), id])} /> : null}
      </Box>
    )
  })

  // transcript: NieR panels, dark title bar over a light paper body
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    const { Box, Markdown, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column" backgroundColor={READ}>
        {e.props.isFirstOfReply ? (
          <Box backgroundColor={INK} paddingX={2}>
            <Text color={PAPER} bold>REPORT</Text>
          </Box>
        ) : null}
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Markdown text={e.props.text} />
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'UserMessage' }, ($, e, next) => {
    if (e.props.from || e.props.task || !e.props.text) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column" backgroundColor={PAPER}>
        <Box backgroundColor={INK} paddingX={2}>
          <Text color={PAPER} bold>INPUT</Text>
        </Box>
        <Box paddingX={2} paddingY={1}>
          <Text color={INK}>{e.props.text}</Text>
        </Box>
      </Box>
    )
  })
}
