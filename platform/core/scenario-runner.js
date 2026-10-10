import {createSceneRuntime, validateScene} from './scene-runtime'
import {createEventBus} from './event-bus'
import {createGameClock} from './game-clock'

const copy = value => JSON.parse(JSON.stringify(value))
const inputTypes = new Set(['ar.marker_detected', 'ar.target_found', 'input.target_touched', 'presentation.sequence_finished', 'presentation.sequence_replay'])

export function createScenarioRunner({gameId, scenario: source, registry,
  capabilities = [], markerIds = [], objectIds = [], hintIds = [],
  clock: suppliedClock, sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2),
  debug = false, onComplete = () => {}, onObserverError = () => {}}) {
  const scenario = copy(source)
  const environment = {capabilities, markerIds, objectIds, hintIds}
  if (!gameId || !scenario.id || !Array.isArray(scenario.steps) || !scenario.steps.length) throw new Error('Scenario identity and steps are required')
  const steps = new Map()
  for (const step of scenario.steps) {
    validateScene(step)
    if (step.kind !== 'presentation') registry.validateStep(step, environment)
    if (steps.has(step.step_id)) throw new Error('Duplicate step_id: ' + step.step_id)
    steps.set(step.step_id, step)
  }
  if (!steps.has(scenario.first_step)) throw new Error('Unknown first_step')
  const visited = new Set()
  const visiting = new Set()
  function visit(id) {
    if (visiting.has(id)) throw new Error('Scenario cycles are not supported; use explicit restart')
    if (visited.has(id)) return
    if (!steps.has(id)) throw new Error('Unknown next step: ' + id)
    visiting.add(id)
    for (const next of Object.values(steps.get(id).next)) if (next !== null) visit(next)
    visiting.delete(id)
    visited.add(id)
  }
  visit(scenario.first_step)
  if (visited.size !== steps.size) throw new Error('Scenario contains unreachable steps')

  const clock = suppliedClock || createGameClock()
  let status = 'READY'
  let activeStep = null
  let instance = null
  let runId = null
  let runNumber = 0
  let eventNumber = 0
  let outcome = null
  let errorMessage = null
  let lastSnapshot = null
  const seen = new Set()
  const history = []
  function envelope(type, payload = {}, source = 'runner', scopeRun = runId) {
    return {event_id: sessionId + '/event/' + (++eventNumber), type,
      game_id: gameId, episode_id: scenario.id, session_id: sessionId,
      step_id: activeStep ? activeStep.step_id : null, run_id: scopeRun, source, payload}
  }
  const matches = event => event.game_id === gameId && event.episode_id === scenario.id &&
    event.session_id === sessionId && event.step_id === activeStep?.step_id && event.run_id === runId
  const bus = createEventBus({onError: fatal, onObserverError})
  const emit = (type, payload = {}) => bus.emit(envelope(type, payload))
  function snapshot() {
    const mechanic = instance ? instance.getSnapshot() : lastSnapshot
    return copy({status, game_id: gameId, episode_id: scenario.id, session_id: sessionId,
      step_id: activeStep?.step_id || null, run_id: runId, step: activeStep,
      paused: clock.isPaused(), outcome, error: errorMessage,
      mechanic, scene_id: activeStep?.step_id || null,
      scene_phase: mechanic?.scene_phase || status, scenario_state: mechanic?.scenario_state || activeStep?.scenario_state || status, history})
  }
  function fatal(error) {
    if (status === 'ERROR' || status === 'DISPOSED') return
    status = 'ERROR'
    errorMessage = error instanceof Error ? error.message : String(error)
    if (instance) { lastSnapshot = instance.getSnapshot(); instance.dispose(); instance = null }
    clock.pause()
    emit('scenario.error', {message: errorMessage})
  }
  function enter(id) {
    if (instance) instance.dispose()
    activeStep = steps.get(id)
    runId = sessionId + '/run/' + (++runNumber)
    const thisRun = runId
    outcome = null
    lastSnapshot = null
    seen.clear()
    status = 'ACTIVE'
    try {
      const context = {
        clock,
        emit(type, payload) {
          if (runId === thisRun && !['DISPOSED', 'ERROR'].includes(status)) {
            bus.emit(envelope(type, {mechanic_id: activeStep.mechanic_id, ...payload}, 'mechanic', thisRun))
          }
        },
        onError: error => { if (runId === thisRun) fatal(error) },
      }
      instance = activeStep.kind === 'presentation' || activeStep.enter || activeStep.exit
        ? createSceneRuntime(activeStep, context, activeStep.kind === 'presentation' ? null : ctx => registry.create(activeStep, ctx, environment))
        : registry.create(activeStep, context, environment)
      emit('scenario.step_changed', {transition: 'NEXT', step: activeStep})
      if (status === 'ACTIVE' && runId === thisRun) instance.start()
    } catch (error) { fatal(error) }
  }
  bus.on('*', event => {
    if (status !== 'ACTIVE' || clock.isPaused() || !matches(event) || !inputTypes.has(event.type)) return
    instance.handle(event)
  })
  bus.on('mechanic.completed', event => {
    if (status !== 'ACTIVE' || !matches(event)) return
    outcome = event.payload.outcome
    lastSnapshot = event.payload.snapshot
    status = 'AWAITING_NEXT'
    history.push({step_id: activeStep.step_id, run_id: runId, outcome})
    if (activeStep.advance === 'auto') emit('scenario.advance_requested')
  })
  bus.on('scenario.advance_requested', event => {
    if (status !== 'AWAITING_NEXT' || !matches(event) || clock.isPaused()) return
    const next = activeStep.next[outcome === 'SUCCESS' ? 'success' : 'fail']
    if (next !== null) { enter(next); return }
    lastSnapshot = instance.getSnapshot()
    instance.dispose()
    instance = null
    status = outcome === 'SUCCESS' ? 'COMPLETE' : 'FAIL'
    emit('scenario.completed', {outcome, snapshot: snapshot()})
  })
  bus.on('scenario.completed', event => { if (matches(event)) onComplete(copy(event.payload)) })
  bus.on('scene.retry_requested', event => {
    if (status === 'DISPOSED' || !matches(event)) return
    const id = activeStep.step_id
    for (let i = history.length - 1; i >= 0; i--) if (history[i].step_id === id) history.splice(i, 1)
    errorMessage = null
    emit('scene.retrying', {scene_id: id})
    enter(id)
  })
  bus.on('scenario.restart_requested', () => {
    if (status === 'DISPOSED') return
    errorMessage = null
    history.length = 0
    emit('scenario.restarted')
    enter(scenario.first_step)
  })
  return {
    on: bus.on,
    getSnapshot: snapshot,
    getTime: () => clock.now(),
    retryCurrent() {
      if (!activeStep || status === 'DISPOSED' || clock.isPaused()) return false
      emit('scene.retry_requested'); return true
    },
    debug: debug ? {
      jump(id) {
        if (!steps.has(id) || status === 'DISPOSED' || clock.isPaused()) return false
        emit('debug.scene_jump', {target: id}); history.length = 0; enter(id); return true
      },
    } : null,
    createInput: (type, payload, source = 'adapter') => envelope(type, payload, source),
    dispatch(event) {
      if (status !== 'ACTIVE' || clock.isPaused() || !matches(event) || !inputTypes.has(event.type) ||
          typeof event.event_id !== 'string' || !event.event_id || seen.has(event.event_id)) return false
      if (!event.payload || typeof event.payload !== 'object') return false
      seen.add(event.event_id)
      // Only retain a bounded deduplication window. Terminal guards are authoritative.
      if (seen.size > 1024) seen.delete(seen.values().next().value)
      try { bus.emit(event); return true } catch (error) { fatal(error); return false }
    },
    input(type, payload, source = 'adapter') { return this.dispatch(envelope(type, payload, source)) },
    start() {
      if (status !== 'READY') return false
      enter(scenario.first_step)
      return true
    },
    next() {
      if (status !== 'AWAITING_NEXT' || clock.isPaused()) return false
      emit('scenario.advance_requested')
      return true
    },
    restart() {
      if (status === 'DISPOSED' || clock.isPaused()) return false
      emit('scenario.restart_requested')
      return true
    },
    pause() {
      if (status !== 'DISPOSED' && !clock.isPaused()) { clock.pause(); emit('scenario.paused') }
    },
    resume() {
      if (!['DISPOSED', 'ERROR'].includes(status) && clock.isPaused()) { clock.resume(); emit('scenario.resumed') }
    },
    dispose() {
      if (status === 'DISPOSED') return
      if (instance) { lastSnapshot = instance.getSnapshot(); instance.dispose(); instance = null }
      status = 'DISPOSED'
      bus.dispose()
      clock.dispose()
      seen.clear()
    },
  }
}
