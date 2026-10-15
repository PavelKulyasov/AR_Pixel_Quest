// Actual A-Frame and DOM, simulated XR events. Does not test camera recognition.
const fs = require('node:fs')
const path = require('node:path')
const {pathToFileURL} = require('node:url')
const {spawnSync} = require('node:child_process')
const babel = require('@babel/core')
const root = path.resolve(__dirname, '..')
const out = path.join(root, 'tmp', 'episode-01-smoke')
fs.mkdirSync(out, {recursive: true})
const modules = new Map()
function collect(filename) {
  filename = path.resolve(filename)
  const id = path.relative(root, filename).replaceAll('\\', '/')
  if (modules.has(id)) return id
  if (filename.endsWith('.json')) {
    modules.set(id, 'module.exports=' + JSON.stringify(JSON.parse(fs.readFileSync(filename, 'utf8'))))
    return id
  }
  modules.set(id, '')
  let {code} = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, presets: [['@babel/preset-env', {targets: {chrome: '100'}, modules: 'commonjs'}]],
  })
  code = code.replace(/require\("([^"]+)"\)/g, (_, name) => {
    const dependency = collect(path.resolve(path.dirname(filename), name.endsWith('.json') ? name : name + '.js'))
    return 'require(' + JSON.stringify(dependency) + ')'
  })
  modules.set(id, code)
  return id
}
const entry = collect(path.join(root, 'games/pixel-quest/episodes/episode-01/component.js'))
const bundle = '(function(){const factories={' + [...modules].map(([id, code]) =>
  JSON.stringify(id) + ':function(module,exports,require){' + code + '}').join(',') +
  '};const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};factories[id](m,m.exports,require)}return cache[id].exports};window.episodeComponent=require(' +
  JSON.stringify(entry) + ').episodeComponent;})();'
fs.writeFileSync(path.join(out, 'bundle.js'), bundle)
const aframe = pathToFileURL(path.join(root, 'external/scripts/8frame-1.5.0.min.js')).href
const model = pathToFileURL(path.join(root, 'games/pixel-quest/assets/anomaly.glb')).href
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html><head><meta charset="utf-8">
<style>${fs.readFileSync(path.join(root, "platform/ui/quest-ui.css"), "utf8")}</style><script src="${aframe}"></script><script src="./bundle.js"></script>
</head><body><pre id="result">PENDING</pre>
<script>
window.addEventListener('error', event => { document.getElementById('result').textContent = 'FAIL: ' + event.message })
// 8frame waits for XR8 before playing even when no xrweb component is attached.
window.XR8 = {}
AFRAME.registerComponent('episode-01', window.episodeComponent)
const scene = document.createElement('a-scene')
scene.setAttribute('embedded', '')
scene.innerHTML = '<a-assets><a-asset-item id="anomalyModel" src="${model}"></a-asset-item></a-assets><a-camera position="0 0 4"></a-camera>'
document.body.appendChild(scene)
const check = (condition, message) => { if (!condition) throw new Error(message) }
scene.addEventListener('loaded', () => {
  try {
    scene.setAttribute('episode-01', '')
    const settle = () => scene.components['episode-01'].tick(0, 10000)
    const emit = (type, name) => scene.emit(type, {
      name, position: {x: 1, y: 2, z: -3}, rotation: {x: 0, y: 0, z: 0, w: 1}, scale: 0.5,
    }, false)
    const found = name => emit('xrimagefound', name)
    const centerButton = button => {
      const rail = document.querySelector('.quest-carousel')
      const r = rail.getBoundingClientRect(), b = button.getBoundingClientRect()
      rail.scrollTo({left: rail.scrollLeft + b.left + b.width/2 - r.left - r.width/2, behavior:'instant'})
      rail.dispatchEvent(new Event('scroll'))
    }
    const click = label => {
      const button = [...document.querySelectorAll('.quest-panel .quest-actions button')].find(b => b.textContent === label)
      check(button, 'Missing button: ' + label)
      centerButton(button)
      button.click()
    }
    found('23_Element_Water')
    check(!document.getElementById('character_file'), 'Locked file spawned')
    found('20_Element_Fire')
    check(document.querySelector('.quest-character').textContent === 'Вы меня видите?', 'First contact missing')
    const character = document.getElementById('anomaly_character')
    check(character.object3D.visible, 'Character hidden')
    check(character.object3D.position.x === 1 && character.object3D.scale.x === 0.5, 'Pose not applied')
    // Simulate model loading after a non-origin target pose has already arrived.
    const visual = character.lastElementChild
    visual.setObject3D('mesh', new AFRAME.THREE.Mesh(new AFRAME.THREE.BoxGeometry(2, 4, 2)))
    scene.object3D.updateMatrixWorld(true)
    visual.emit('model-loaded', {}, false)
    check(Math.abs(visual.object3D.scale.x - 0.175) < 0.00001, 'Model scale depends on world pose')
    check(Math.abs(visual.object3D.position.x) < 0.00001, 'Model position depends on world pose')
    click('НЕТ')
    check(document.querySelectorAll('.quest-panel .quest-actions button').length === 2, 'NO lost buttons')
    emit('xrimagelost', '20_Element_Fire')
    check(character.object3D.visible, 'Lost marker hid character')
    check(document.querySelector('.quest-status').textContent === '', 'Stale lost notice')
    const changedPose = {name: '20_Element_Fire', position: {x: 9, y: 8, z: 7}, rotation: {x: 0, y: 1, z: 0, w: 0}, scale: 2}
    scene.emit('xrimagefound', changedPose, false)
    scene.emit('xrimageupdated', changedPose, false)
    check(character.object3D.position.x === 1, 'Raw pose applied without interpolation')
    scene.components['episode-01'].tick(0, 100)
    check(Math.abs(character.object3D.position.x - (9 - 8 / Math.E)) < 0.00001, 'Incorrect lerp response')
    check(character.object3D.quaternion.y > 0 && character.object3D.quaternion.y < 1, 'Rotation not interpolated')
    changedPose.position.x = 99
    scene.components['episode-01'].tick(0, 50)
    scene.components['episode-01'].tick(0, 50)
    check(Math.abs(character.object3D.position.x - (9 - 8 / Math.exp(2))) < 0.00001, 'Frame rate or mutable event changed interpolation')
    settle()
    check(character.object3D.position.x === 9 && character.object3D.position.y === 8 && character.object3D.position.z === 7, 'Reacquisition failed to correct drift')
    check(character.object3D.quaternion.y === 1 && character.object3D.scale.x === 0.5, 'Reacquisition must correct rotation and preserve initial scale')
    const camera = scene.querySelector('a-camera')
    camera.object3D.position.set(4, 3, 2)
    camera.object3D.rotation.set(0, 1, 0)
    scene.object3D.updateMatrixWorld(true)
    const world = character.object3D.getWorldPosition(new AFRAME.THREE.Vector3())
    check(world.distanceTo(new AFRAME.THREE.Vector3(9, 8, 7)) < 0.00001, 'Character follows camera')
    check(character.object3D.visible, 'Character not retained')
    scene.emit('xrimageupdated', {...changedPose, position: {x: 10, y: 8, z: 7}}, false)
    settle()
    check(character.object3D.position.x === 10, 'Visible target correction ignored')
    scene.emit('xrimageupdated', {...changedPose, scale: NaN}, false)
    check(character.object3D.position.x === 10 && character.object3D.scale.x === 0.5, 'Invalid pose corrupted anchor')
    emit('xrimagelost', '20_Element_Fire')
    check(character.object3D.visible && character.object3D.position.x === 10, 'Loss did not preserve last good pose')
    check(document.querySelectorAll('#anomaly_character').length === 1, 'Duplicate character')
    found('22_Element_Air')
    check(!document.getElementById('system_terminal'), 'Locked terminal spawned')
    click('ДА')
    click('Далее')
    check(character.object3D.visible, 'Completed interaction hid character')
    scene.emit('xrimagefound', {...changedPose, position: {x: 11, y: 8, z: 7}}, false)
    settle()
    check(character.object3D.position.x === 11, 'Completed marker cannot relocalize')
    changedPose.rotation.y = 0
    // A later render must not pick up mutations to an old XR event object.
    check(character.object3D.quaternion.y === 1, 'Pose retained mutable event reference')
    check(document.getElementById('system_terminal').object3D.visible, 'Already-tracked terminal not unlocked')
    click('Журнал прослушан')
    click('Далее')
    check(document.getElementById('character_file').object3D.visible, 'Already-tracked file not unlocked')
    for (const [target, id] of [['22_Element_Air', 'system_terminal'], ['23_Element_Water', 'character_file']]) {
      emit('xrimagelost', target)
      check(document.getElementById(id).object3D.visible, 'Lost marker hid ' + id)
      check(document.getElementById(id).object3D.position.x === 1, 'Lost marker moved ' + id)
    }
    click('Файл прослушан')
    click('Далее')
    for (let i = 0; i < 5; i++) click('Далее')
    check(document.querySelector('.quest-character').textContent === 'До следующей встречи.', 'Farewell missing')
    click('Далее')
    check(document.querySelector('.quest-task').textContent === 'Эпизод завершён.', 'Not completed')
    for (const id of ['anomaly_character', 'system_terminal', 'character_file']) {
      check(!document.getElementById(id).object3D.visible, 'Episode completion left object visible: ' + id)
    }
    found('20_Element_Fire')
    check(document.querySelectorAll('.quest-panel .quest-actions button').length === 0, 'Completed flow restarted')
    check(!character.object3D.visible, 'Reacquisition after completion restored character')
    scene.removeAttribute('episode-01')
    check(!document.querySelector('.quest-ui'), 'UI not removed')
    check(!document.getElementById('anomaly_character'), 'AR entity not removed')
    scene.setAttribute('episode-01', '')
    check(document.querySelectorAll('.quest-ui').length === 1, 'Fresh run duplicated UI')
    found('20_Element_Fire')
    check(document.querySelector('.quest-character').textContent === 'Вы меня видите?', 'Fresh run failed')
    document.getElementById('result').textContent = 'PASS: UI, poses, locks, tracking loss, completion, cleanup, fresh run'
  } catch (error) { document.getElementById('result').textContent = 'FAIL: ' + error.stack }
}, {once: true})
</script></body></html>`)
const browser = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const result = spawnSync(browser, [
  '--headless', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
  '--user-data-dir=' + path.join(out, 'profile'), '--dump-dom', '--virtual-time-budget=12000',
  pathToFileURL(path.join(out, 'index.html')).href,
], {encoding: 'utf8', timeout: 45000, maxBuffer: 4 * 1024 * 1024})
const status = (result.stdout || '').match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1]
if (!status?.startsWith('PASS:')) fs.writeFileSync(path.join(out, 'failure.html'), result.stdout || result.stderr || '')
console.log(status || result.error || result.stderr || 'Browser produced no test result')
process.exitCode = status?.startsWith('PASS:') ? 0 : 1
