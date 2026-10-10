export function createArObjectManager(scene, definitions, {createVisual = null, smoothingMs = 100} = {}) {
  if (!Number.isFinite(smoothingMs) || smoothingMs < 0) throw new Error('Invalid smoothingMs')
  // One filtered pose and one fixed scale per marker, shared by all its objects.
  const targets = new Map()
  const markerKey = id => definitions[id].marker_id || id
  const diagnostic = new URLSearchParams(window.location.search).get('tracking') === '1'
  const panel = diagnostic ? document.createElement('details') : null
  let lastReport = -Infinity
  if (panel) {
    panel.className = 'ar-tracking-diagnostics'
    panel.open = true
    panel.style.cssText = 'position:fixed;top:8px;left:8px;z-index:10000;max-width:90vw;max-height:38vh;overflow:auto;background:#08121eee;color:#bfffd5;padding:10px;font:11px monospace;white-space:pre-wrap'
    const summary = document.createElement('summary')
    summary.textContent = 'AR · диагностика (свернуть)'
    panel.appendChild(summary)
    panel.appendChild(document.createElement('pre'))
    document.body.appendChild(panel)
  }
  const applyPose = (id, anchor, target) => {
    anchor.position.copy(target.currentPosition)
    anchor.quaternion.copy(target.currentRotation)
    anchor.scale.setScalar(target.scale)
    const offset = definitions[id].offset
    if (offset) anchor.position.add(new AFRAME.THREE.Vector3(offset.x, offset.y, offset.z).multiplyScalar(target.scale).applyQuaternion(target.currentRotation))
  }
  const visuals = new Map()
  const visualCleanups = new Set()
  const objects = new Map()
  const highlights = new Map()
  function clearHighlight(id) {
    for (const {mesh, original, copies} of highlights.get(id) || []) {
      mesh.material = original
      copies.forEach(material => material.dispose())
    }
    highlights.delete(id)
  }
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
    } else if (createVisual && definition.visual) {
      const disposeVisual = createVisual(visual, definition)
      if (typeof disposeVisual === 'function') visualCleanups.add(disposeVisual)
    } else {
      visual.setAttribute('geometry', {primitive: 'box', width: 0.65, height: 0.45, depth: 0.05})
      visual.setAttribute('material', {color: definition.color, metalness: 0.2, roughness: 0.7})
      visual.setAttribute('position', '0 0.25 0')
    }
    visuals.set(id, visual)
    anchor.appendChild(visual)
    scene.appendChild(anchor)
    objects.set(id, anchor)
    return anchor
  }
  return {
    show(id, pose) {
      // Reject invalid observations without destroying the last usable anchor.
      if (!pose || !pose.position || !pose.rotation ||
          ![pose.position.x, pose.position.y, pose.position.z,
            pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w,
            pose.scale].every(Number.isFinite) || pose.scale <= 0) return
      const anchor = objects.get(id) || create(id)
      const key = markerKey(id)
      let target = targets.get(key)
      const position = new AFRAME.THREE.Vector3().copy(pose.position)
      const rotation = new AFRAME.THREE.Quaternion().copy(pose.rotation).normalize()
      if (!target) {
        target = {position: position.clone(), rotation: rotation.clone(), currentPosition: position.clone(), currentRotation: rotation.clone(), scale: pose.scale}
        targets.set(key, target)
      }
      target.rawScale = pose.scale
      target.rawPosition = position
      // Ignore tiny marker jitter; meaningful corrections still relocalize the scene.
      if (position.distanceTo(target.position) > target.scale * .015) target.position.copy(position)
      if (1 - Math.abs(rotation.dot(target.rotation)) > .000038) target.rotation.copy(rotation)
      if (smoothingMs === 0) {
        target.currentPosition.copy(target.position)
        target.currentRotation.copy(target.rotation)
      }
      applyPose(id, anchor.object3D, target)
      anchor.object3D.visible = true
    },
    tick(deltaMs) {
      if (!Number.isFinite(deltaMs) || deltaMs <= 0) return
      const alpha = smoothingMs === 0 ? 1 : -Math.expm1(-deltaMs / smoothingMs)
      for (const target of targets.values()) {
        target.currentPosition.lerp(target.position, alpha)
        target.currentRotation.slerp(target.rotation, alpha)
      }
      for (const [id, anchor] of objects) {
        if (anchor.object3D.visible) applyPose(id, anchor.object3D, targets.get(markerKey(id)))
      }
      if (panel && performance.now() - lastReport >= 250) {
        lastReport = performance.now()
        const camera = scene.camera?.getWorldPosition(new AFRAME.THREE.Vector3())
        const n = value => Number.isFinite(value) ? value.toFixed(4) : '—'
        const lines = ['Масштаб фиксирован при размещении.', 'Расстояния в единицах AR, не метрах.']
        for (const [key, target] of targets) {
          lines.push(key + ':', 'scale вход / фикс: ' + n(target.rawScale) + ' / ' + n(target.scale),
            'камера → маркер: ' + n(camera?.distanceTo(target.currentPosition)),
            'коррекция позиции: ' + n(target.rawPosition.distanceTo(target.currentPosition)))
        }
        for (const [id, visual] of visuals) {
          const data = visual.object3D.userData.nulik
          if (data && objects.get(id).object3D.visible) lines.push(id + ' масштаб модели: ' + n(data.frame.scale.x))
        }
        panel.lastElementChild.textContent = lines.join('\n')
      }
    },
    highlight(id, color = '#a6ffde') {
      clearHighlight(id)
      const saved = []
      objects.get(id)?.object3D.traverse(mesh => {
        if (!mesh.isMesh || !mesh.material) return
        const original = mesh.material
        const copies = (Array.isArray(original) ? original : [original]).map(material => {
          const copy = material.clone()
          if (copy.color) copy.color.set(color)
          if (copy.emissive) { copy.emissive.set(color); copy.emissiveIntensity = 0.5 }
          return copy
        })
        mesh.material = Array.isArray(original) ? copies : copies[0]
        saved.push({mesh, original, copies})
      })
      highlights.set(id, saved)
    },
    clearHighlight,
    getVisual3D(id) { return visuals.get(id)?.object3D || null },
    getObject3D(id) { return objects.get(id)?.object3D || null },
    hide(id) { clearHighlight(id); const anchor = objects.get(id); if (anchor) anchor.object3D.visible = false },
    dispose() { panel?.remove(); for (const id of highlights.keys()) clearHighlight(id); visualCleanups.forEach(dispose => dispose()); visualCleanups.clear(); objects.forEach(anchor => anchor.remove()); objects.clear(); visuals.clear(); targets.clear() },
  }
}