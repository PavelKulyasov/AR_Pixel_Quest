// Timers count active gameplay time, not wall time spent in a hidden tab.
export function createGameClock({now = () => performance.now(), setTimer = setTimeout, clearTimer = clearTimeout} = {}) {
  const timers = new Set()
  let elapsed = 0
  let resumedAt = now()
  let paused = false
  let disposed = false
  const time = () => elapsed + (paused || disposed ? 0 : Math.max(0, now() - resumedAt))
  function arm(timer) {
    const version = ++timer.version
    timer.handle = setTimer(() => {
      if (paused || disposed || !timers.has(timer) || version !== timer.version) return
      timers.delete(timer)
      timer.callback()
    }, Math.max(0, timer.due - time()))
  }
  return {
    now: time,
    isPaused: () => paused,
    schedule(delay, callback) {
      if (disposed) throw new Error('Game clock is disposed')
      if (!Number.isFinite(delay) || delay < 0 || typeof callback !== 'function') throw new Error('Invalid game timer')
      const timer = {due: time() + delay, callback, handle: null, version: 0}
      timers.add(timer)
      if (!paused) arm(timer)
      return () => { timers.delete(timer); timer.version++; clearTimer(timer.handle) }
    },
    pause() {
      if (paused || disposed) return
      elapsed = time()
      paused = true
      for (const timer of timers) { timer.version++; clearTimer(timer.handle) }
    },
    resume() {
      if (!paused || disposed) return
      resumedAt = now()
      paused = false
      for (const timer of timers) arm(timer)
    },
    dispose() {
      if (disposed) return
      elapsed = time()
      disposed = true
      for (const timer of timers) { timer.version++; clearTimer(timer.handle) }
      timers.clear()
    },
  }
}
