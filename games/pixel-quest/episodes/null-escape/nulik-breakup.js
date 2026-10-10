// Story presentation only. The marker anchors and gameplay mechanics stay authoritative.
export function createNulikBreakup(objects) {
  let active = null
  const reset = () => {
    if (active?.data) for (const part of Object.values(active.data.parts)) {
      part.pivot.position.copy(part.position)
      part.pivot.quaternion.copy(part.quaternion)
      part.pivot.scale.copy(part.scale)
    }
    active = null
  }
  const directions = {head: [0, .7, .15], body: [0, -.65, .15], left_arm: [.7, .12, .25], right_arm: [-.7, .15, .25]}
  const smooth = t => t * t * (3 - 2 * t)
  return {
    start(now, duration) { reset(); active = {start: now, duration: Math.max(1, duration)} },
    reset,
    tick(now) {
      if (!active) return
      const data = objects.getVisual3D('null')?.userData.nulik
      const portal = objects.getObject3D('portal')
      if (!data || !portal?.visible) return
      active.data = data
      const {Box3, Vector3, Quaternion, Euler} = AFRAME.THREE
      data.rig.updateWorldMatrix(true, true)
      portal.updateWorldMatrix(true, true)
      const target = data.rig.worldToLocal(new Box3().setFromObject(portal).getCenter(new Vector3()))
      const t = Math.max(0, Math.min(1, (now - active.start) / active.duration))
      const fly = smooth(Math.max(0, (t - .38) / .62))
      for (const [name, part] of Object.entries(data.parts)) {
        const direction = new Vector3(...directions[name]).multiplyScalar(data.extent)
        const spread = part.position.clone().add(direction)
        if (t < .38) part.pivot.position.copy(part.position).lerp(spread, smooth(t / .38))
        else part.pivot.position.copy(spread).lerp(target, fly)
        const spin = name === 'left_arm' ? 4 : name === 'right_arm' ? -4 : 1.2
        part.pivot.quaternion.copy(part.quaternion).multiply(new Quaternion().setFromEuler(new Euler(t * .6, t * spin, t * spin * .4)))
        part.pivot.scale.copy(part.scale).multiplyScalar(1 - .96 * fly)
      }
    },
  }
}
