import {createNulikRig, nulikObjectIds} from './nulik-parts'
const modelUrl = 'assets/Nulik-mobile.glb'
const modelScaleMultiplier = 2
let templatePromise = null

// The source is static rigid geometry. Share one parse/texture set, but independent pivots.
function loadNulik() {
  if (!templatePromise) {
    templatePromise = new Promise((resolve, reject) => {
      new AFRAME.THREE.GLTFLoader().load(modelUrl, gltf => resolve(gltf), undefined, reject)
    }).catch(error => { templatePromise = null; throw error })
  }
  return templatePromise
}

// Keep normalization below the visual root: story effects animate that root.
export function createNulikVisual(root, selectedPart = null) {
  let disposed = false
  root.object3D.userData.nulikLoadStatus = 'loading'
  const frame = document.createElement('a-entity')
  const model = document.createElement('a-entity')
  model.setAttribute('data-nulik-model', selectedPart || 'full')
  frame.appendChild(model); root.appendChild(frame)
  const failed = () => { if (!disposed) root.object3D.userData.nulikLoadStatus = 'error' }
  model.addEventListener('model-error', failed)
  loadNulik().then(template => {
    if (disposed) return
    const data = createNulikRig(template.scene, selectedPart, template.animations)
    model.setObject3D('mesh', data.rig)
    model.object3D.position.copy(data.center).multiplyScalar(-1)
    frame.object3D.scale.setScalar(.7 * modelScaleMultiplier / data.extent)
    root.object3D.userData.nulik = {...data, frame: frame.object3D, selectedPart}
    root.object3D.userData.nulikLoadStatus = 'ready'
    model.emit('model-loaded', {format: 'gltf', model: data.rig}, false)
  }).catch(error => {
    if (disposed) return
    console.error('Nulik model failed to load', error)
    model.emit('model-error', {format: 'gltf', src: modelUrl}, false)
  })
  return () => {
    disposed = true
    model.removeEventListener('model-error', failed)
    root.object3D.userData.nulik?.disposeAnimation?.()
    delete root.object3D.userData.nulikLoadStatus
    delete root.object3D.userData.nulik
  }
}
// Calibrate once at the first visible pose. Walking closer then behaves like normal AR.
// Reuse the same physical size after assembly and on scene retries.
export function createNulikFraming(objects, scene) {
  let fittedExtent = null
  return () => {
    const camera = scene.camera
    if (!camera) return
    for (const id of nulikObjectIds) {
      const visual = objects.getVisual3D(id)
      const data = visual?.userData.nulik
      if (!data || data.fitted) continue
      if (fittedExtent === null) {
        if (!objects.getObject3D(id)?.visible) continue
        // Measure the full-size character, independent of the introductory appear effect.
        const effectScale = visual.scale.clone()
        visual.scale.setScalar(1)
        scene.object3D.updateMatrixWorld(true)
        camera.updateMatrixWorld(true)
        const {Vector3} = AFRAME.THREE
        const corners = []
        for (const x of [data.framingBounds.min.x, data.framingBounds.max.x])
          for (const y of [data.framingBounds.min.y, data.framingBounds.max.y])
            for (const z of [data.framingBounds.min.z, data.framingBounds.max.z]) corners.push(new Vector3(x, y, z))
        const fits = scale => {
          data.frame.scale.setScalar(scale)
          data.frame.updateMatrixWorld(true)
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
          for (const corner of corners) {
            const p = corner.clone().applyMatrix4(data.frame.matrixWorld).applyMatrix4(camera.matrixWorldInverse)
            if (p.z >= -camera.near) return false
            p.applyMatrix4(camera.projectionMatrix)
            minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
            minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
          }
          // NDC spans two units across the viewport.
          return Math.max(maxX - minX, maxY - minY) <= .35 * 2
        }
        if (!fits(0)) { visual.scale.copy(effectScale); data.frame.scale.setScalar(.7 * modelScaleMultiplier / data.extent); continue }
        let low = 0, high = .7 / data.extent
        if (fits(high)) low = high
        else for (let i = 0; i < 24; i++) {
          const middle = (low + high) / 2
          if (fits(middle)) low = middle
          else high = middle
        }
        fittedExtent = low * data.extent
        visual.scale.copy(effectScale)
      }
      // The requested 2x enlargement is applied after the original screen calibration.
      data.frame.scale.setScalar(fittedExtent * modelScaleMultiplier / data.extent)
      data.fitted = true
    }
  }
}

// Parse once before scanning; every character/part shares the loaded geometry and textures.
export function createNulikLoading(objects) {
  let transfer = 'loading'
  loadNulik().then(() => { transfer = 'ready' }, () => { transfer = 'error' })
  const notice = document.createElement('div')
  notice.className = 'null-model-status'
  notice.setAttribute('role', 'status')
  notice.setAttribute('aria-live', 'polite')
  document.body.appendChild(notice)
  const tick = () => {
    const visible = nulikObjectIds.filter(id => objects.getObject3D(id)?.visible)
    const states = visible.map(id => objects.getVisual3D(id)?.userData.nulikLoadStatus)
    const state = visible.length ? (states.includes('error') ? 'error' : states.includes('loading') ? 'loading' : 'ready')
      : objects.getObject3D('null') ? 'ready' : transfer
    const message = state === 'loading' ? 'Загружается Нулик…'
      : state === 'error' ? 'Не удалось загрузить Нулика. Обнови страницу, чтобы попробовать ещё раз.' : ''
    if (notice.textContent !== message) notice.textContent = message
    notice.hidden = !message
  }
  tick()
  return {tick, dispose() { notice.remove() }}
}
