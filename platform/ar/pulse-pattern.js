// Alternating pulse/pause durations, driven by the runner's active clock.
export function validatePulsePattern(pattern) {
  if (!Array.isArray(pattern) || !pattern.length || pattern.length % 2 ||
      pattern.some(ms => !Number.isFinite(ms) || ms <= 0) ||
      !Number.isFinite(pattern.reduce((sum, ms) => sum + ms, 0))) throw new Error('Invalid pulse pattern')
}
export function pulseAmount(pattern, elapsed) {
  const period = pattern.reduce((sum, ms) => sum + ms, 0)
  let phase = Math.max(0, elapsed) % period
  for (let i = 0; i < pattern.length; i++) {
    if (phase < pattern[i]) return i % 2 ? 0 : Math.sin(Math.PI * phase / pattern[i])
    phase -= pattern[i]
  }
  return 0
}
export function createPulsePatterns(objects) {
  const active = new Map()
  function stop(id) {
    const item = active.get(id)
    if (item?.object) item.object.scale.copy(item.scale)
    active.delete(id)
  }
  return {
    start(id, pattern, now) {
      validatePulsePattern(pattern)
      stop(id); active.set(id, {pattern: [...pattern], start: now})
    },
    stop,
    reset() { for (const id of active.keys()) stop(id) },
    tick(now) {
      for (const [id, item] of active) {
        const object = objects.getVisual3D(id)
        if (!object) continue
        if (!item.object) Object.assign(item, {object, scale: object.scale.clone()})
        object.scale.copy(item.scale).multiplyScalar(1 + .3 * pulseAmount(item.pattern, now - item.start))
      }
    },
  }
}
