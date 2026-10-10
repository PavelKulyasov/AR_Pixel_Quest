// One pointer gesture produces at most one input. No click/touch compatibility listeners.
export function createInteractionAdapter({THREE, scene, getTargets, getSnapshot, onTouch}) {
  const doc = scene.ownerDocument
  const ray = new THREE.Raycaster()
  const point = new THREE.Vector2()
  let pending = null
  let serial = 0
  const reset = () => { pending = null }
  const active = snapshot => snapshot.status === 'ACTIVE' && !snapshot.paused && !doc.hidden
  const canvasEvent = event => event.target === scene.canvas && event.isPrimary !== false && event.button === 0
  const visible = object => {
    for (let node = object; node; node = node.parent) if (!node.visible) return false
    return true
  }
  function hit(event, snapshot) {
    const canvas = scene.canvas
    const camera = scene.camera
    if (!canvas || !camera) return null
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null
    point.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2)
    if (Math.abs(point.x) > 1 || Math.abs(point.y) > 1) return null
    // Pointer capture must not allow release over an HTML panel to touch the scene.
    if (doc.elementFromPoint(event.clientX, event.clientY) !== canvas) return null
    scene.object3D.updateMatrixWorld(true)
    camera.updateMatrixWorld(true)
    ray.setFromCamera(point, camera)
    const first = ray.intersectObjects(scene.object3D.children, true).find(item => visible(item.object))
    if (!first) return null
    for (const {id, object} of getTargets(snapshot)) {
      if (!object || !visible(object)) continue
      for (let node = first.object; node; node = node.parent) if (node === object) return id
    }
    return null
  }
  function down(event) {
    reset()
    const snapshot = getSnapshot()
    if (!active(snapshot) || !canvasEvent(event)) return
    const id = hit(event, snapshot)
    if (id) pending = {id, pointer: event.pointerId, run: snapshot.run_id, x: event.clientX, y: event.clientY}
  }
  function move(event) {
    if (pending && event.pointerId === pending.pointer && Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 12) reset()
  }
  function up(event) {
    const gesture = pending
    reset()
    const snapshot = getSnapshot()
    if (!gesture || !active(snapshot) || !canvasEvent(event) || event.pointerId !== gesture.pointer || snapshot.run_id !== gesture.run) return
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 12 || hit(event, snapshot) !== gesture.id) return
    onTouch({target_id: gesture.id, interaction_id: gesture.run + '/pointer/' + (++serial)}, gesture.run)
  }
  const listeners = {pointerdown: down, pointermove: move, pointerup: up, pointercancel: reset, visibilitychange: reset}
  for (const [type, handler] of Object.entries(listeners)) doc.addEventListener(type, handler, true)
  return {reset, dispose() {
    reset()
    for (const [type, handler] of Object.entries(listeners)) doc.removeEventListener(type, handler, true)
  }}
}
