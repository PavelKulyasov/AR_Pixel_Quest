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
  modules.set(id, '')
  let {code} = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, presets: [['@babel/preset-env', {targets: {chrome: '100'}, modules: 'commonjs'}]],
  })
  code = code.replace(/require\("([^"]+)"\)/g, (_, name) => {
    const dependency = collect(path.resolve(path.dirname(filename), name + '.js'))
    return 'require(' + JSON.stringify(dependency) + ')'
  })
  modules.set(id, code)
  return id
}
const entry = collect(path.join(root, 'src/episodes/episode-01/component.js'))
const bundle = '(function(){const factories={' + [...modules].map(([id, code]) =>
  JSON.stringify(id) + ':function(module,exports,require){' + code + '}').join(',') +
  '};const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};factories[id](m,m.exports,require)}return cache[id].exports};window.episodeComponent=require(' +
  JSON.stringify(entry) + ').episodeComponent;})();'
fs.writeFileSync(path.join(out, 'bundle.js'), bundle)
const aframe = pathToFileURL(path.join(root, 'external/scripts/8frame-1.5.0.min.js')).href
const model = pathToFileURL(path.join(root, 'src/assets/anomaly.glb')).href
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html><head><meta charset="utf-8">
<script src="${aframe}"></script><script src="./bundle.js"></script>
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
    const emit = (type, name) => scene.emit(type, {
      name, position: {x: 1, y: 2, z: -3}, rotation: {x: 0, y: 0, z: 0, w: 1}, scale: 0.5,
    }, false)
    const found = name => emit('xrimagefound', name)
    const click = label => {
      const button = [...document.querySelectorAll('.quest-panel .quest-actions button')].find(b => b.textContent === label)
      check(button, 'Missing button: ' + label)
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
    check(!character.object3D.visible, 'Lost character visible')
    check(document.querySelector('.quest-status').textContent.length > 0, 'Missing lost notice')
    found('20_Element_Fire')
    check(character.object3D.visible, 'Character not restored')
    check(document.querySelectorAll('#anomaly_character').length === 1, 'Duplicate character')
    found('22_Element_Air')
    check(!document.getElementById('system_terminal'), 'Locked terminal spawned')
    click('ДА')
    click('Далее')
    check(!character.object3D.visible, 'Completed character remains visible')
    check(document.getElementById('system_terminal').object3D.visible, 'Already-tracked terminal not unlocked')
    click('Журнал прослушан')
    click('Далее')
    check(document.getElementById('character_file').object3D.visible, 'Already-tracked file not unlocked')
    click('Файл прослушан')
    click('Далее')
    for (let i = 0; i < 5; i++) click('Далее')
    check(document.querySelector('.quest-character').textContent === 'До следующей встречи.', 'Farewell missing')
    click('Далее')
    check(document.querySelector('.quest-task').textContent === 'Эпизод завершён.', 'Not completed')
    check(!document.getElementById('character_file').object3D.visible, 'Completed file visible')
    found('20_Element_Fire')
    check(document.querySelectorAll('.quest-panel .quest-actions button').length === 0, 'Completed flow restarted')
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
