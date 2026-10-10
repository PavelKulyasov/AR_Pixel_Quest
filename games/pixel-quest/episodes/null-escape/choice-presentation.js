import {createPulsePatterns} from '../../../../platform/ar/pulse-pattern'
import {chooseConfig, corePattern} from './choose-config'
import {dialogues} from './dialogues'
// Visual rhythm and feedback do not decide whether the answer is correct.
export function createChoicePresentation({runner, ui, objects, audio, content, actions}) {
  const pulses = createPulsePatterns(objects)
  const off = runner.on('*', event => {
    if (['scenario.step_changed', 'scenario.completed', 'scenario.error'].includes(event.type)) pulses.reset()
    if (event.payload.mechanic_id !== 'AR-06') return
    if (event.type === 'mechanic.started') {
      for (const core of chooseConfig.cores) pulses.start(core.id, corePattern(core.id), runner.getTime())
      ui.render({...content.steps.choose_core.start, showText: true, actions})
    }
    if (event.type === 'mechanic.feedback' && event.payload.type === 'wrong_choice') {
      objects.highlight(event.payload.target_id, '#82796c')
      ui.render({...content.steps.choose_core.start, ...dialogues.core_wrong, showText: true, actions})
      audio.play('UI', 'denied')
    }
    if (event.type === 'scene.mechanic_completed') pulses.reset()
  })
  return {tick: now => pulses.tick(now), dispose() {off(); pulses.reset()}}
}
