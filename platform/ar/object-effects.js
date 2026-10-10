// Animate visual children only: marker/world anchors remain authoritative.
export function createObjectEffects(objects) {
  const active = new Map()
  function stop(id) {
    const effect = active.get(id)
    if (effect?.object) {
      effect.object.position.copy(effect.position)
      effect.object.scale.copy(effect.scale)
    }
    active.delete(id)
  }
  return {
    start(id, name, now) { stop(id); active.set(id, {name, start: now}) },
    stop,
    reset() { for (const id of active.keys()) stop(id) },
    tick(now) {
      for (const [id, effect] of active) {
        const object = objects.getVisual3D(id)
        if (!object) continue
        if (!effect.object) Object.assign(effect, {object, position: object.position.clone(), scale: object.scale.clone()})
        const t = (now - effect.start) / 1000
        object.position.copy(effect.position)
        object.scale.copy(effect.scale)
        if (effect.name === 'pulse') object.scale.multiplyScalar(1 + .12 * Math.sin(t * 5))
        if (effect.name === 'appear') object.scale.multiplyScalar(Math.min(1, Math.max(.01, t * 2)))
        if (effect.name === 'glitch') object.position.x += Math.sin(t * 29) * .035
        if (effect.name === 'vanish') {
          object.scale.multiplyScalar(Math.max(.01, 1 - t))
          object.position.y += t * .3
        }
      }
    },
  }
}
