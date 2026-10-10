const copy = value => JSON.parse(JSON.stringify(value))

export function createMechanicLifecycle(config, context, initialState) {
  let status = 'READY'
  let state = copy(initialState)
  let progress = {current: 0, total: 1}
  let outcome = null
  let reason = null
  const cancelTimers = new Set()
  const clear = () => { cancelTimers.forEach(cancel => cancel()); cancelTimers.clear() }
  const snapshot = () => copy({mechanic_id: config.mechanic_id, status, state, progress, outcome, reason})
  function schedule(delay, callback) {
    const cancel = context.clock.schedule(delay, () => {
      cancelTimers.delete(cancel)
      if (status !== 'ACTIVE') return
      try { callback() } catch (error) { context.onError(error) }
    })
    cancelTimers.add(cancel)
  }
  function finish(result, why = null) {
    if (status !== 'ACTIVE') return false
    outcome = result
    reason = why
    status = result
    clear()
    context.emit('mechanic.status', {status: result})
    // A critical subscriber may have disposed this run while dispatching status.
    if (status === 'DISPOSED') return false
    status = 'COMPLETE'
    context.emit('mechanic.completed', {outcome, reason, snapshot: snapshot()})
    return true
  }
  return {
    isActive: () => status === 'ACTIVE',
    getSnapshot: snapshot,
    start() {
      if (status !== 'READY') return false
      status = 'ACTIVE'
      if (config.parameters.time_limit != null) schedule(config.parameters.time_limit, () => finish('FAIL', 'timeout'))
      for (const hint of config.hints || []) schedule(hint.after_ms, () => context.emit('mechanic.hint', {content_id: hint.content_id}))
      context.emit('mechanic.started', {transition: 'START', snapshot: snapshot()})
      return true
    },
    update(patch, nextProgress) {
      if (status !== 'ACTIVE') return false
      Object.assign(state, copy(patch))
      progress = copy(nextProgress)
      context.emit('mechanic.progress', {progress, state})
      return true
    },
    succeed: () => finish('SUCCESS'),
    fail: why => finish('FAIL', why),
    reset() {
      if (status === 'DISPOSED') return false
      clear()
      state = copy(initialState)
      progress = {current: 0, total: 1}
      outcome = reason = null
      status = 'READY'
      return true
    },
    dispose() { clear(); status = 'DISPOSED' },
  }
}
