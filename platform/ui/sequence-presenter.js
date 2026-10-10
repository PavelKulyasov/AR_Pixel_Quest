import {createGameClock} from '../core/game-clock'

// Presentation confirms only the current token/run, after every visible pulse and gap.
export function createSequencePresenter({runner, highlight, clearHighlight, isReady, onFrame = () => {}, clock = createGameClock()}) {
  let cancelTimer = null
  let lit = null
  let generation = 0
  const clear = () => { if (lit !== null) clearHighlight(lit); lit = null }
  function cancel() {
    generation += 1
    if (cancelTimer) cancelTimer()
    cancelTimer = null
    clear()
  }
  function play(event) {
    cancel()
    const version = generation
    const {token, sequence, display_speed: duration, gap_ms: gap} = event.payload
    const finished = runner.createInput('presentation.sequence_finished', {token}, 'presentation')
    const valid = () => {
      const s = runner.getSnapshot()
      return generation === version && s.status === 'ACTIVE' && !s.paused && s.run_id === event.run_id && s.mechanic.state.presentation_token === token
    }
    const schedule = (ms, fn) => { cancelTimer = clock.schedule(ms, () => { cancelTimer = null; if (valid()) fn() }) }
    let index = 0
    function pulse() {
      if (!sequence.every(isReady)) { schedule(50, pulse); return }
      lit = sequence[index]
      highlight(lit)
      onFrame(lit, index + 1, sequence.length)
      schedule(duration, () => {
        clear()
        schedule(gap, () => {
          index += 1
          if (index < sequence.length) pulse()
          else runner.dispatch(finished)
        })
      })
    }
    schedule(1000, pulse)
  }
  const unsubscribe = runner.on('*', event => {
    if (event.type === 'scenario.paused' || event.type === 'scenario.restarted' || event.type === 'scenario.step_changed' || event.type === 'scenario.error' || event.type === 'mechanic.completed' || event.type === 'scenario.completed') cancel()
    if (event.type === 'scenario.resumed') {
      const s = runner.getSnapshot()
      if (s.status === 'ACTIVE' && s.step.mechanic_id === 'AR-07') runner.input('presentation.sequence_replay', {}, 'presentation')
    }
    if (event.run_id !== runner.getSnapshot().run_id) return
    if (event.type === 'mechanic.sequence_requested') play(event)
    if (event.type === 'mechanic.feedback' && event.payload.type === 'sequence_input') {
      cancel(); lit = event.payload.target_id; highlight(lit)
      cancelTimer = clock.schedule(180, () => { cancelTimer = null; clear() })
    }
  })
  return {dispose() { unsubscribe(); cancel(); clock.dispose() }}
}
