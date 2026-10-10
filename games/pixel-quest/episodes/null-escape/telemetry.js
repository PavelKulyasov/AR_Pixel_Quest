export function observeNullEscape(runner, sink = record => console.info('[Null Escape]', record)) {
  let started = runner.getTime()
  let sceneStart = started
  const attempts = new Map()
  return runner.on('*', event => {
    const s = runner.getSnapshot()
    let name
    if (event.type === 'scenario.step_changed') {
      sceneStart = runner.getTime()
      attempts.set(s.scene_id, (attempts.get(s.scene_id) || 0) + 1)
      if (s.scene_id === 'scan_terminal') {started = sceneStart; name = 'scenario_started'}
    }
    if (event.type === 'mechanic.completed' && event.payload.mechanic_id === 'AR-01') name = 'marker_detected'
    if (event.type === 'scene.mechanic_completed' && event.payload.mechanic_id === 'AR-03') name = 'red_button_pressed'
    if (event.type === 'mechanic.started' && event.payload.mechanic_id === 'AR-02') name = 'null_discover_started'
    if (event.type === 'scene.mechanic_completed' && event.payload.mechanic_id === 'AR-02') name = 'null_found'
    if (event.type === 'mechanic.started' && event.payload.mechanic_id === 'AR-05') name = 'collect_started'
    if (event.type === 'mechanic.feedback' && event.payload.mechanic_id === 'AR-05' && event.payload.type === 'collected') name = 'part_collected'
    if (event.type === 'scene.mechanic_completed' && event.payload.mechanic_id === 'AR-05') name = 'collect_completed'
    if (event.type === 'mechanic.started' && event.payload.mechanic_id === 'AR-06') name = 'choose_started'
    if (event.type === 'mechanic.feedback' && event.payload.mechanic_id === 'AR-06' && event.payload.type === 'wrong_choice') name = 'wrong_core_selected'
    if (event.type === 'mechanic.feedback' && event.payload.mechanic_id === 'AR-06' && event.payload.type === 'activated') name = 'correct_core_selected'
    if (event.type === 'mechanic.started' && event.payload.mechanic_id === 'AR-07') name = 'sequence_started'
    if (event.type === 'mechanic.feedback' && event.payload.mechanic_id === 'AR-07' && event.payload.type === 'wrong_sequence') name = 'sequence_failed'
    if (event.type === 'scene.mechanic_completed' && event.payload.mechanic_id === 'AR-07') name = 'sequence_completed'
    if (event.type === 'scene.command' && event.payload.command.type === 'state' && event.payload.command.value === 'ANOMALY_EVENT') name = 'anomaly_event_started'
    if (event.type === 'scenario.completed') name = 'scenario_completed'
    if (!name) return
    sink({name, target_id: event.payload.target_id || null, timestamp: new Date().toISOString(), scenario_id: s.episode_id, scene_id: event.step_id,
      mechanic_id: event.payload.mechanic_id || s.step?.mechanic_id || null, attempt: attempts.get(s.scene_id) || 1,
      duration_ms: runner.getTime() - sceneStart, scenario_duration_ms: runner.getTime() - started,
      session_id: s.session_id, run_id: event.run_id, scenario_state: s.scenario_state})
  }, {critical: false})
}
