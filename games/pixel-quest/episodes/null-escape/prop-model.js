const templates = new Map()
const settings = {
  terminal: {height: .65, centerY: .325, rotateX: 0},
  button: {width: .24, centerY: 0, rotateX: Math.PI / 2},
  portal: {height: .87, centerY: 0, rotateX: 0},
}
const load = name => {
  if (!templates.has(name)) templates.set(name, new Promise((resolve, reject) => {
    new AFRAME.THREE.GLTFLoader().load('assets/' + name + '-mobile.glb', gltf => resolve(gltf.scene), undefined, reject)
  }).catch(error => { templates.delete(name); throw error }))
  return templates.get(name)
}
export function createPropVisual(root, name) {
  let disposed = false
  root.object3D.userData.propLoadStatus = 'loading'
  root.setAttribute('data-prop-model', name)
  load(name).then(template => {
    if (disposed) return
    const {Group, Box3, Vector3} = AFRAME.THREE
    const mesh = template.clone(true)
    mesh.rotation.x += settings[name].rotateX
    mesh.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(mesh)
    const size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3())
    const factor = settings[name].width ? settings[name].width / size.x : settings[name].height / size.y
    if (!Number.isFinite(factor) || factor <= 0) throw new Error('Invalid prop bounds: ' + name)
    mesh.position.sub(center)
    const frame = new Group()
    frame.add(mesh); frame.scale.setScalar(factor); frame.position.y = settings[name].centerY
    root.setObject3D('mesh', frame)
    root.object3D.userData.propLoadStatus = 'ready'
    root.emit('model-loaded', {format:'gltf', model:frame}, false)
  }).catch(error => {
    if (disposed) return
    root.object3D.userData.propLoadStatus = 'error'
    root.emit('model-error', {format:'gltf'}, false)
    console.error('Prop model failed to load: ' + name, error)
  })
  return () => { disposed = true; root.removeObject3D('mesh'); delete root.object3D.userData.propLoadStatus }
}
// Warm up all three models before their story scenes; one parse per URL.
export function createPropLoading(objects) {
  for (const name of Object.keys(settings)) load(name).catch(() => {})
  const notice = document.createElement('div')
  notice.className = 'null-model-status null-prop-status'
  notice.style.bottom = '90px'
  notice.setAttribute('role', 'status')
  notice.setAttribute('aria-live', 'polite')
  notice.hidden = true
  document.body.appendChild(notice)
  return {
    tick() {
      const states = ['terminal','red_button','portal'].filter(id => objects.getObject3D(id)?.visible)
        .map(id => objects.getVisual3D(id)?.userData.propLoadStatus)
      notice.textContent = states.includes('error') ? 'Не удалось загрузить объекты сцены. Обнови страницу.'
        : states.includes('loading') ? 'Загружаются объекты сцены…' : ''
      notice.hidden = !notice.textContent
    },
    dispose() { notice.remove() },
  }
}
