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
