// Geometry and continuous observation belong to the AR adapter, not gameplay logic.
export function createDiscoveryAdapter({THREE, scene, getTarget, getStep, onFound}) {
  const bounds = new THREE.Box3()
  const center = new THREE.Vector3()
  const projected = new THREE.Vector3()
  const origin = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const ray = new THREE.Raycaster()
  let run = null
  let started = null
  let previous = null
  let sent = false
  const reset = () => { run = null; started = null; previous = null; sent = false }
  const visible = object => {
    for (let node = object; node; node = node.parent) if (!node.visible) return false
    return true
  }
  const belongsTo = (object, root) => {
    for (let node = object; node; node = node.parent) if (node === root) return true
    return false
  }
  return {
    reset,
    tick(now) {
      const snapshot = getStep()
      if (!snapshot || snapshot.status !== 'ACTIVE' || (snapshot.scene_phase && snapshot.scene_phase !== 'ACTIVE') || snapshot.paused || snapshot.step.mechanic_id !== 'AR-02') { reset(); return }
      if (run !== snapshot.run_id) { reset(); run = snapshot.run_id }
      if (sent) return
      const {content, parameters} = snapshot.step
      const target = getTarget(content.target_id)
      const camera = scene.camera
      let seen = false
      if (target && camera && visible(target)) {
        scene.object3D.updateMatrixWorld(true)
        camera.updateMatrixWorld(true)
        bounds.setFromObject(target)
        if (!bounds.isEmpty()) {
          bounds.getCenter(center)
          projected.copy(center).project(camera)
          const radius = parameters.search_radius ?? 0.35
          if (projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) <= radius && Math.abs(projected.y) <= radius) {
            camera.getWorldPosition(origin)
            direction.copy(center).sub(origin).normalize()
            ray.set(origin, direction)
            ray.near = 0
            ray.far = origin.distanceTo(center) + bounds.getSize(new THREE.Vector3()).length()
            const hit = ray.intersectObjects(scene.object3D.children, true).find(item => visible(item.object))
            seen = !!hit && belongsTo(hit.object, target)
          }
        }
      }
      // A long render gap cannot prove continuous observation.
      if (!Number.isFinite(now) || !seen) { started = null; previous = null; return }
      if (started === null || previous === null || now < previous || now - previous > 250) started = now
      previous = now
      const observed = now - started
      if (observed >= (parameters.hold_ms ?? 500)) {
        sent = true
        onFound(content.target_id, observed, snapshot.run_id)
      }
    },
  }
}
