export function createArObjectManager(scene, definitions) {
  const objects = new Map()
  function create(id) {
    const definition = definitions[id]
    const anchor = document.createElement('a-entity')
    anchor.id = definition.id
    anchor.object3D.visible = false
    const visual = document.createElement('a-entity')
    if (definition.model) {
      // A small placeholder remains visible if the supplied model cannot load.
      const placeholder = document.createElement('a-sphere')
      placeholder.setAttribute('radius', '0.15')
      placeholder.setAttribute('color', definition.color)
      anchor.appendChild(placeholder)
      visual.addEventListener('model-loaded', () => {
        const mesh = visual.getObject3D('mesh')
        if (!mesh) return
        const {Box3, Vector3} = AFRAME.THREE
        // Measure a detached hierarchy so the tracked anchor's world pose cannot distort normalization.
        const bounds = new Box3().setFromObject(mesh.clone(true))
        const size = bounds.getSize(new Vector3())
        const factor = 0.7 / Math.max(size.x, size.y, size.z, 0.001)
        visual.object3D.scale.setScalar(factor)
        const center = bounds.getCenter(new Vector3())
        visual.object3D.position.set(-center.x * factor, -bounds.min.y * factor, -center.z * factor)
        placeholder.object3D.visible = false
      })
      visual.setAttribute('gltf-model', definition.model)
    } else {
      visual.setAttribute('geometry', {primitive: 'box', width: 0.65, height: 0.45, depth: 0.05})
      visual.setAttribute('material', {color: definition.color, metalness: 0.2, roughness: 0.7})
      visual.setAttribute('position', '0 0.25 0')
    }
    anchor.appendChild(visual)
    scene.appendChild(anchor)
    objects.set(id, anchor)
    return anchor
  }
  return {
    show(id, pose) {
      const anchor = objects.get(id) || create(id)
      anchor.object3D.position.copy(pose.position)
      anchor.object3D.quaternion.copy(pose.rotation)
      anchor.object3D.scale.setScalar(pose.scale)
      anchor.object3D.visible = true
    },
    hide(id) { const anchor = objects.get(id); if (anchor) anchor.object3D.visible = false },
    dispose() { objects.forEach(anchor => anchor.remove()); objects.clear() },
  }
}