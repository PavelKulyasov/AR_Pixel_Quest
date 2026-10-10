export function createStorySequencePresentation({runner, ui, content, audio}) {
  const views = content.steps.portal_sequence
  const actions = [{id: 'REPLAY', label: views.replayLabel}, {id: 'RETRY', label: 'Повторить сцену'}]
  const render = view => ui.render({...view, showText: true, actions})
  const off = runner.on('*', event => {
    if (event.payload.mechanic_id !== 'AR-07') return
    if (event.type === 'mechanic.sequence_requested') {
      render(event.payload.reason === 'error' ? views.wrongSequence : views.start)
      ui.tracking('Показ последовательности')
    }
    if (event.type === 'mechanic.sequence_ready') {render(views.input); ui.tracking('0 / ' + runner.getSnapshot().step.parameters.sequence_length)}
    if (event.type === 'mechanic.progress' && event.payload.state.phase === 'INPUT') {
      ui.tracking(event.payload.progress.current + ' / ' + event.payload.progress.total)
    }
    if (event.type === 'mechanic.feedback') {
      if (event.payload.type === 'wrong_sequence') audio.play('UI', 'denied')
      if (event.payload.type === 'sequence_input') audio.play('GAMEPLAY', 'notification')
    }
    if (event.type === 'mechanic.hint') {
      render({...((runner.getSnapshot().mechanic.state.phase === 'INPUT') ? views.input : views.start), system: content.hints[event.payload.content_id]})
    }
  })
  return {dispose: off}
}
