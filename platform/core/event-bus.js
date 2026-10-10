// A synchronous FIFO queue: nested emissions are processed after current listeners.
export function createEventBus({onError = error => { throw error }, onObserverError = () => {}} = {}) {
  const listeners = new Set()
  const queue = []
  let draining = false
  let disposed = false
  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze)
      Object.freeze(value)
    }
    return value
  }
  return {
    on(type, handle, {critical = true} = {}) {
      if (disposed) throw new Error('Event bus is disposed')
      if (typeof handle !== 'function') throw new Error('Event handler must be a function')
      const listener = {type, handle, critical}
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    emit(event) {
      if (disposed) return false
      if (!event || typeof event.type !== 'string' || !event.type) throw new Error('Event type is required')
      // Independent immutable payloads prevent observers from mutating gameplay.
      const copy = JSON.parse(JSON.stringify(event, (_key, value) => {
        if (typeof value === 'function' || typeof value === 'symbol' ||
            typeof value === 'bigint' || (typeof value === 'number' && !Number.isFinite(value))) {
          throw new Error('Events must contain JSON data')
        }
        return value
      }))
      queue.push(freeze(copy))
      if (draining) return true
      draining = true
      let delivered = 0
      try {
        while (queue.length && !disposed) {
          const next = queue.shift()
          if (++delivered > 10000) {
            queue.length = 0
            onError(new Error('Event loop limit exceeded'), next)
            break
          }
          for (const listener of [...listeners]) {
            if (!listeners.has(listener) || (listener.type !== '*' && listener.type !== next.type)) continue
            try { listener.handle(next) } catch (error) {
              if (listener.critical) {
                queue.length = 0
                onError(error, next)
                break
              }
              try { onObserverError(error, next) } catch (_) { /* diagnostics are optional */ }
            }
          }
        }
      } finally { draining = false }
      return true
    },
    dispose() { disposed = true; listeners.clear(); queue.length = 0 },
  }
}
