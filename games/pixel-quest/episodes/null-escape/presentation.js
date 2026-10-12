import {createPropLoading} from './prop-model'
import {createNulikGestures} from './nulik-gestures'
import {createNulikBreakup} from './nulik-breakup'
import {createNulikFraming, createNulikLoading} from './nulik-model'
import {createFinalePresentation} from './finale-presentation'
import {createStorySequencePresentation} from './sequence-presentation'
import {createChoicePresentation} from './choice-presentation'
import {createDirectionAdapter} from '../../../../platform/ar/direction-adapter'
import {collectConfig, partsChecklist} from './collect-config'
import {searchConfig} from './search-config'
import {createObjectEffects} from '../../../../platform/ar/object-effects'
import {createAudioDirector} from '../../../../platform/modules/audio/audio-director'
import {createDialoguePlayer} from '../../../../platform/modules/dialogue/dialogue-player'
import {createScenarioDebug} from '../../../../platform/ui/scenario-debug'
import {game} from '../../config/game'
import {dialogues} from './dialogues'
import {nullEscapeScenario} from './scenario'
import {observeNullEscape} from './telemetry'
export function createPresentation({runner, ui, content, objects, scene, show, hide}) {
  const fitNulik = createNulikFraming(objects, scene)
  const modelLoading = createNulikLoading(objects)
  const propLoading = createPropLoading(objects)
  const breakup = createNulikBreakup(objects)
  let levitationStopped = false
  let hintLevel = 0
  const direction = createDirectionAdapter({THREE: AFRAME.THREE, scene, getTarget: id => objects.getObject3D(id)})
  const effects = createObjectEffects(objects)
  const audio = createAudioDirector(game.modules.audio.create)
  const actions = [{id: 'RETRY', label: 'Повторить сцену'}]
  const dialogue = createDialoguePlayer({ui, dialogues, actions})
  const debug = createScenarioDebug(runner, nullEscapeScenario)
  const telemetry = observeNullEscape(runner)
  const off = runner.on('*', event => {
    if (event.type === 'scenario.step_changed') {
      levitationStopped = false; breakup.reset(); effects.reset(); audio.stop(); hintLevel = 0; ui.searchMode(); ui.searchHint(); ui.tracking()
      for (const id of Object.keys(content.objects)) hide(id)
      ui.render({...content.steps[event.payload.step.step_id].start, showText: true, actions})
    }
    if (event.type === 'scene.command') {
      const c = event.payload.command
      if (c.type === 'show') show(c.target)
      if (c.type === 'hide') {effects.stop(c.target); hide(c.target)}
      if (c.type === 'effect') {
        if (c.target === 'null' && c.effect === 'vanish') { levitationStopped = true; effects.stop('null'); breakup.start(runner.getTime(), c.duration_ms) }
        else effects.start(c.target, c.effect, runner.getTime())
      }
      if (c.type === 'dialogue') dialogue.show(c.id)
      if (c.type === 'sound') audio.play(c.category, c.cue)
    }
    if (event.type === 'mechanic.started' && event.payload.mechanic_id === 'AR-02') {
      ui.render({...content.steps.discover_null.start, showText: true, actions})
      ui.searchMode(searchConfig.search_radius)
      ui.searchHint('НАЙДИ НУЛИКА · Осмотрись камерой')
    }
    if (event.type === 'scene.mechanic_completed' && event.payload.mechanic_id === 'AR-02') {
      ui.searchMode(); ui.searchHint(); effects.stop(searchConfig.target_id)
      objects.highlight(searchConfig.target_id, '#a6ffde')
    }
    if (event.type === 'mechanic.progress' && event.payload.mechanic_id === 'AR-05') {
      const {collected_ids, collected_count} = event.payload.state
      ui.render({task: 'СОБЕРИ ДЕТАЛИ НУЛИКА', system: partsChecklist(collected_ids), showText: true, actions})
      ui.tracking(collected_count + ' / ' + collectConfig.parts.length)
    }
    if (event.type === 'mechanic.feedback' && event.payload.mechanic_id === 'AR-05' && event.payload.type === 'collected') {
      audio.play('GAMEPLAY', 'notification')
    }
    if (event.type === 'mechanic.hint') {
      const id = event.payload.content_id
      ui.render({system: content.hints[id], showText: true, actions})
      if (id === 'collect_highlight') {
        const collected = runner.getSnapshot().mechanic.state.collected_ids
        for (const part of collectConfig.parts) if (!collected.includes(part.id)) objects.highlight(part.id, '#ffffff')
        audio.play('GAMEPLAY', 'attention')
      }
      if (searchConfig.stages[id]) {
        hintLevel = searchConfig.stages[id]
        ui.searchHint(content.hints[id]); audio.play('GAMEPLAY', 'attention')
        if (hintLevel >= 3) objects.highlight(searchConfig.target_id, '#ffffff')
      }
    }
    if (event.type === 'scenario.paused') audio.stop()
    if (event.type === 'scenario.completed') {breakup.reset(); effects.reset(); audio.stop(); ui.searchMode(); ui.searchHint(); ui.render(content.complete)}
    if (event.type === 'scenario.error') {breakup.reset(); effects.reset(); audio.stop(); ui.searchMode(); ui.searchHint(); ui.render(content.error)}
  })
  const gestures = createNulikGestures({runner, objects, dialogues})
  const finale = createFinalePresentation({runner, objects})
  const sequence = createStorySequencePresentation({runner, ui, content, audio})
  const choice = createChoicePresentation({runner, ui, objects, audio, content, actions})
  return {unlock: () => audio.unlock(),
    tick: now => {
      fitNulik(); modelLoading.tick(); propLoading.tick()
      for (const id of ['null', 'null_assembled']) {
        if (id === 'null' && levitationStopped) continue
        if (objects.getObject3D(id)?.visible) objects.getVisual3D(id)?.userData.nulik?.animate(now / 1000)
      }
      gestures.tick(now); effects.tick(now); breakup.tick(now); choice.tick(now); finale.tick()
      const s = runner.getSnapshot()
      if (hintLevel >= 2 && !s.paused && s.scene_phase === 'ACTIVE' && s.step?.mechanic_id === 'AR-02') {
        const arrow = searchConfig.directions[direction.read(searchConfig.target_id, searchConfig.search_radius)]
        ui.searchHint((hintLevel >= 3 ? 'Ищи светящуюся голову · ' : '') + arrow)
      }
    },
    dispose() {gestures.dispose(); breakup.reset(); modelLoading.dispose(); propLoading.dispose(); finale.dispose(); sequence.dispose(); choice.dispose(); off(); telemetry(); debug.dispose(); effects.reset(); audio.dispose()}}
}
