import { expect, test } from 'claude-code/testing'

const REPLY = { component: 'AssistantMessage', props: { text: 'hi', isFirstOfReply: true } } as const

// Retro panels off: the app draws replies its own way, no REPORT bar
for (const restyle of [true, false]) {
  test(`retro panels ${restyle ? 'on' : 'off'}`, { options: { restyle } }, async ($, on) => {
    // stands for the app drawing the reply its own way
    on('ui.render', { component: 'AssistantMessage' }, (hook$, e) => {
      const { Text } = hook$.ui.resolve(e)
      return <Text>APP</Text>
    })
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: 'linecat', surface, ...REPLY })
      expect(Boolean(await ui.find({ type: 'Text', text: 'REPORT' }))).toBe(restyle)
      expect(Boolean(await ui.find({ type: 'Text', text: 'APP' }))).toBe(!restyle)
      await ui.unmount()
    }
  })
}

// Another plugin's band beneath this one survives: linecat shows it with its own, never instead
const BAND = { component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 120 } } as const

for (const place of ['band', 'pane'] as const) {
  test(`another band survives, line in the ${place}`, { options: { place } }, async ($, on) => {
    // stands for another plugin drawing its own band
    on('ui.render', { component: 'AbovePrompt' }, (hook$, e) => {
      const { Text } = hook$.ui.resolve(e)
      return <Text>OTHER BAND</Text>
    })
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: 'linecat', surface, ...BAND })
      expect(Boolean(await ui.find({ type: 'Text', text: 'OTHER BAND' }))).toBe(true)
      // the line is in the band only when placed there, and only where SVG draws
      const hasLine = Boolean(await ui.find({ type: 'Svg' }))
      expect(hasLine && place === 'pane').toBe(false)
      await ui.unmount()
    }
  })
}
