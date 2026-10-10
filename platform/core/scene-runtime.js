// A scene wraps an existing mechanic; presentation scenes need no invented AR ID.
export function validateScene(step) {
  for (const phase of ['enter', 'exit']) {
    if (step[phase] == null) continue
    if (!Array.isArray(step[phase])) throw new Error('Scene phase must be an array')
    for (const command of step[phase]) {
      if (!command || !['state', 'show', 'hide', 'effect', 'dialogue', 'sound', 'wait'].includes(command.type)) throw new Error('Unknown scene command')
      if (command.duration_ms != null && (!Number.isFinite(command.duration_ms) || command.duration_ms < 0)) throw new Error('Invalid command duration')
      if (['show', 'hide', 'effect'].includes(command.type) && (typeof command.target !== 'string' || !command.target)) throw new Error('Missing command target')
      if (command.type === 'effect' && !['appear', 'pulse', 'glitch', 'vanish'].includes(command.effect)) throw new Error('Unknown object effect')
      if (command.type === 'dialogue' && (typeof command.id !== 'string' || !command.id)) throw new Error('Missing dialogue id')
      if (command.type === 'sound' && (!['UI', 'GAMEPLAY', 'STORY'].includes(command.category) || typeof command.cue !== 'string' || !command.cue)) throw new Error('Invalid sound command')
      if (command.type === 'state' && (typeof command.value !== 'string' || !command.value)) throw new Error('Missing scene state')
    }
  }
  if (step.kind === 'presentation') {
    if (step.mechanic_id != null || typeof step.step_id !== 'string' || !step.step_id) throw new Error('Invalid presentation scene')
    if (!step.next || !['success', 'fail'].every(key => step.next[key] === null || typeof step.next[key] === 'string')) throw new Error('Invalid scene next')
  }
}

export function createSceneRuntime(step, context, createMechanic) {
  let phase = 'READY', state = step.scenario_state || 'INTRO', disposed = false, generation = 0, cancel = null
  let result = null
  const send = (type, payload) => { if (!disposed) context.emit(type, payload) }
  const inner = createMechanic ? createMechanic({...context, emit(type, payload) {
    if (disposed) return
    if (type !== 'mechanic.completed') { send(type, payload); return }
    result = payload
    send('scene.mechanic_completed', payload)
    if (payload.outcome === 'SUCCESS') play(step.exit || [], 'PRESENTING', complete)
    else complete()
  }}) : null
  function complete() {
    if (disposed) return
    phase = 'COMPLETE'
    if (!result) result = {outcome: 'SUCCESS', reason: null}
    send('mechanic.completed', {...(result || {outcome: 'SUCCESS', reason: null}), snapshot: snapshot()})
  }
  function play(commands, nextPhase, done) {
    phase = nextPhase
    const token = ++generation
    let index = 0
    function next() {
      cancel = null
      if (disposed || generation !== token) return
      try {
        while (index < commands.length) {
          const command = commands[index++]
          if (command.type === 'state') state = command.value
          send('scene.command', {command, phase, scenario_state: state})
          if (disposed || generation !== token) return
          if (command.duration_ms > 0) { cancel = context.clock.schedule(command.duration_ms, next); return }
        }
        done()
      } catch (error) { context.onError(error) }
    }
    next()
  }
  function snapshot() {
    const mechanic = inner?.getSnapshot() || {mechanic_id: null, status: phase, state: {}, progress: {current: phase === 'COMPLETE' ? 1 : 0, total: 1}, outcome: result?.outcome || null}
    return {...mechanic, scene_phase: phase, scenario_state: state}
  }
  return {
    start() {
      if (phase !== 'READY' || disposed) return false
      play(step.enter || [], 'PREPARING', () => {
        if (inner) { phase = 'ACTIVE'; inner.start() }
        else play(step.exit || [], 'PRESENTING', complete)
      })
      return true
    },
    handle(event) { if (!disposed && phase === 'ACTIVE') inner?.handle(event) },
    getSnapshot: snapshot,
    reset() {
      if (disposed) return false
      if (cancel) cancel(); cancel = null; generation++; inner?.reset()
      phase = 'READY'; state = step.scenario_state || 'INTRO'; result = null; return true
    },
    dispose() { disposed = true; generation++; if (cancel) cancel(); inner?.dispose(); phase = 'DISPOSED' },
  }
}
