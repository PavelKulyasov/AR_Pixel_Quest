// Content supplies all player-facing copy; logic and success checks stay in mechanics.
export function createMechanicPresenter({runner, ui, content}) {
  const actions = step => [
    ...(step.mechanic_id === 'AR-07' ? [{id: 'REPLAY', label: content.steps[step.step_id].replayLabel}] : []),
    {id: 'RESTART', label: content.restartLabel},
  ]
  const showStep = () => {
    const step = runner.getSnapshot().step
    ui.searchMode?.(step.mechanic_id === 'AR-02' ? (step.parameters.search_radius ?? 0.35) : null)
    ui.tracking('')
    ui.render({...content.steps[step.step_id].start, actions: actions(step)})
  }
  const unsubscribe = runner.on('*', event => {
    if (event.run_id !== runner.getSnapshot().run_id) return
    if (event.type === 'scenario.step_changed') showStep()
    else if (event.type === 'mechanic.progress') {
      const {current, total} = event.payload.progress
      ui.tracking(current + ' / ' + total)
    } else if (event.type === 'mechanic.hint') ui.tracking(content.hints[event.payload.content_id])
    else if (event.type === 'mechanic.feedback' && event.payload.type === 'wrong_order') {
      const view = content.steps[runner.getSnapshot().step.step_id]
      if (view.wrongOrder) ui.tracking(view.wrongOrder)
    }
    else if (event.type === 'mechanic.feedback' && event.payload.type === 'wrong_choice') {
      const view = content.steps[runner.getSnapshot().step.step_id]
      if (view.wrongChoice) ui.render({...view.wrongChoice, actions: [{id: 'RESTART', label: content.restartLabel}]})
      if (view.attemptsLabel) ui.tracking(view.attemptsLabel + ': ' + event.payload.attempts +
        (event.payload.attempt_limit === null ? '' : ' / ' + event.payload.attempt_limit))
    }
    else if (['mechanic.sequence_requested', 'mechanic.sequence_ready'].includes(event.type)) {
      const step = runner.getSnapshot().step
      const views = content.steps[step.step_id]
      const key = event.type === 'mechanic.sequence_ready' ? 'input' : event.payload.reason === 'error' ? 'wrongSequence' : 'start'
      ui.render({...views[key], actions: actions(step)})
      ui.tracking(event.type === 'mechanic.sequence_ready' ? '0 / ' + step.parameters.sequence_length : '')
    }
    else if (event.type === 'mechanic.completed') {
      ui.searchMode?.(null)
      const step = runner.getSnapshot().step
      const view = content.steps[step.step_id][event.payload.outcome === 'SUCCESS' ? 'success' : 'fail']
      ui.render({...view, actions: [{id: 'NEXT', label: content.steps[step.step_id].nextLabel || content.nextLabel}, {id: 'RESTART', label: content.restartLabel}]})
    } else if (event.type === 'scenario.completed') {
      ui.searchMode?.(null)
      ui.tracking('')
      ui.render({...content[event.payload.outcome === 'SUCCESS' ? 'complete' : 'failed'], actions: [{id: 'RESTART', label: content.restartLabel}]})
    } else if (event.type === 'scenario.error') {
      ui.searchMode?.(null)
      ui.tracking('')
      ui.render(content.error)
    }
  })
  return {dispose: unsubscribe}
}
