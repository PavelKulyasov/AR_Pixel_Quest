// Screen-space guidance, independent of game text and success detection.
export function directionForTarget(projected, cameraLocal, radius = .35) {
  if (![projected.x, projected.y, cameraLocal.x, cameraLocal.z].every(Number.isFinite)) return 'unavailable'
  // Projection flips behind the camera: use camera-local X instead.
  if (cameraLocal.z >= 0) return cameraLocal.x < 0 ? 'left' : 'right'
  if (Math.abs(projected.x) <= radius && Math.abs(projected.y) <= radius) return 'center'
  if (Math.abs(projected.x) >= Math.abs(projected.y)) return projected.x < 0 ? 'left' : 'right'
  return projected.y < 0 ? 'down' : 'up'
}
export function createDirectionAdapter({THREE, scene, getTarget}) {
  const bounds = new THREE.Box3(), center = new THREE.Vector3()
  const projected = new THREE.Vector3(), local = new THREE.Vector3()
  return {
    read(targetId, radius) {
      const target = getTarget(targetId), camera = scene.camera
      if (!target || !camera) return 'unavailable'
      for (let node = target; node; node = node.parent) if (!node.visible) return 'unavailable'
      scene.object3D.updateMatrixWorld(true); camera.updateMatrixWorld(true)
      bounds.setFromObject(target)
      if (bounds.isEmpty()) return 'unavailable'
      bounds.getCenter(center)
      local.copy(center).applyMatrix4(camera.matrixWorldInverse)
      projected.copy(center).project(camera)
      return directionForTarget(projected, local, radius)
    },
  }
}
