// Actual A-Frame and DOM, simulated XR events. Does not test camera recognition.
const fs = require('node:fs')
const path = require('node:path')
const {pathToFileURL} = require('node:url')
const {spawnSync} = require('node:child_process')
const babel = require('@babel/core')
const root = path.resolve(__dirname, '..')
const out = path.join(root, 'tmp', 'mechanics-smoke')
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
const entry = collect(path.join(root, 'games/pixel-quest/episodes/ar-initiation/component.js'))
const bundle = '(function(){const factories={' + [...modules].map(([id, code]) =>
  JSON.stringify(id) + ':function(module,exports,require){' + code + '}').join(',') +
  '};const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};factories[id](m,m.exports,require)}return cache[id].exports};window.initiationComponent=require(' +
  JSON.stringify(entry) + ').initiationComponent;window.createArObjectManager=require(\"platform/ar/ar-object-manager.js\").createArObjectManager;})();'
fs.writeFileSync(path.join(out, 'bundle.js'), bundle)
const aframe = pathToFileURL(path.join(root, 'external/scripts/8frame-1.5.0.min.js')).href
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html><head><meta charset="utf-8">
<style>${fs.readFileSync(path.join(root, "platform/ui/quest-ui.css"), "utf8")}</style><script src="${aframe}"></script><script src="./bundle.js"></script>
</head><body><pre id="result">PENDING</pre>
<script>
window.addEventListener('error', event => { document.getElementById('result').textContent = 'FAIL: ' + event.message })
window.XR8 = {}
AFRAME.registerComponent('ar-initiation', window.initiationComponent)
const scene = document.createElement('a-scene')
scene.setAttribute('embedded', '')
scene.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh'
scene.innerHTML = '<a-camera position="0 0 4"></a-camera>'
document.body.appendChild(scene)
const check = (condition, message) => { if (!condition) throw new Error(message) }
scene.addEventListener('loaded', async () => {
  try {
    const manager = window.createArObjectManager(scene, {
      probeA: {id:'probe-a',marker_id:'shared',offset:{x:0,y:0,z:0}},
      probeB: {id:'probe-b',marker_id:'shared',offset:{x:2,y:0,z:0}},
      probeC: {id:'probe-c',marker_id:'shared',offset:{x:0,y:1,z:0}},
    })
    const pose = {position:{x:0,y:0,z:-2},rotation:{x:0,y:0,z:0,w:1},scale:2}
    manager.show('probeA',pose);manager.show('probeB',pose)
    manager.show('probeA',{...pose,scale:.5,position:{x:.01,y:0,z:-2}})
    manager.tick(100)
    check(manager.getObject3D('probeA').position.x===0,'Small jitter moved the common anchor')
    check(manager.getObject3D('probeA').scale.x===2,'Tracking scale changed placed object')
    const moved={position:{x:3,y:1,z:-2},rotation:{x:0,y:Math.sin(.3),z:0,w:Math.cos(.3)},scale:.25}
    manager.show('probeA',moved);manager.show('probeB',moved);manager.tick(50)
    check(manager.getObject3D('probeA').position.x>0 && manager.getObject3D('probeA').position.x<3,'Relocalization did not smooth')
    check(Math.abs(manager.getObject3D('probeA').position.distanceTo(manager.getObject3D('probeB').position)-4)<1e-6,'Shared layout deformed during rotation')
    manager.hide('probeB');manager.show('probeB',moved);manager.show('probeC',moved)
    check(manager.getObject3D('probeB').scale.x===2 && manager.getObject3D('probeC').scale.x===2,'Reappearing/new part lost fixed scale')
    manager.show('probeA',{...pose,scale:NaN});manager.tick(50)
    check(manager.getObject3D('probeA').scale.x===2,'Invalid pose affected scale')
    const diagnostic=new URLSearchParams(location.search).get('tracking')==='1'
    check(!!document.querySelector('.ar-tracking-diagnostics')===diagnostic,'Diagnostic opt-in failed')
    if(diagnostic) check(document.querySelector('.ar-tracking-diagnostics').textContent.includes('0.5000 / 2.0000'),'Diagnostic does not show incoming/fixed scales')
    manager.dispose()
    check(!document.querySelector('.ar-tracking-diagnostics'),'Diagnostic leaked on dispose')
    scene.setAttribute('ar-initiation', '')
    const runner = scene.components['ar-initiation'].runner
    const events = []
    runner.on('*', event => events.push(event), {critical: false})
    const emit = (type, name, x = 1) => scene.emit(type, {
      name, position: {x, y: 2, z: -3}, rotation: {x: 0, y: 0, z: 0, w: 1}, scale: .5,
    }, false)
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
    check(document.querySelectorAll('.quest-ui').length === 1, 'Missing initiation UI')
    check(runner.getSnapshot().status === 'ACTIVE', 'Initiation failed to start')
    await new Promise(resolve => setTimeout(resolve, 100))
    const dock = document.querySelector('.quest-ui')
    check(dock.getBoundingClientRect().height <= innerHeight/5 + 1, 'Dock exceeds 20 percent')
    const soundIcon=document.querySelector('.quest-enable'), fullscreenIcon=document.querySelector('.quest-fullscreen')
    check(!soundIcon.closest('.quest-carousel') && !fullscreenIcon.closest('.quest-carousel'),'Screen icons remain in carousel')
    check(soundIcon.querySelector('svg') && fullscreenIcon.querySelector('svg'),'Control icon missing')
    const soundRect=soundIcon.getBoundingClientRect()
    if(!soundIcon.hidden) check(soundRect.left<30 && soundRect.top<30,'Sound icon is not top left')
    if(!fullscreenIcon.hidden) {
      const r=fullscreenIcon.getBoundingClientRect()
      check(r.right>innerWidth-30 && r.bottom<=dock.getBoundingClientRect().top,'Fullscreen icon overlaps dock')
    }
    check(document.querySelector('.quest-content').getBoundingClientRect().bottom<=dock.getBoundingClientRect().top,'Text remains inside dock')
    const textButton = document.querySelector('.quest-text')
    const rectButton = textButton.getBoundingClientRect()
    check(Math.abs(rectButton.width - rectButton.height) < 1, 'Carousel tile is not square')
    const systemText = document.querySelector('.quest-system')
    const wasHidden = systemText.hidden
    textButton.click()
    check(systemText.hidden === wasHidden, 'Side button activated on first click')
    centerButton(textButton); textButton.click()
    check(systemText.hidden !== wasHidden, 'Centered button did not activate')
    textButton.click()
    check(systemText.hidden === wasHidden, 'Centered toggle failed')
    const rail = document.querySelector('.quest-carousel')
    const restartButton = document.querySelector('.quest-panel button')
    centerButton(restartButton)
    check(restartButton.dataset.centered === 'true', 'First tile cannot be centered')
    const lastButton = [...rail.querySelectorAll('button')].filter(b => b.getClientRects().length).at(-1)
    centerButton(lastButton)
    check(lastButton.dataset.centered === 'true', 'Last tile cannot be centered')
    const beforeSwipe = systemText.hidden
    centerButton(textButton)
    textButton.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true,clientX:100,clientY:100}))
    textButton.dispatchEvent(new PointerEvent('pointermove', {bubbles:true,clientX:150,clientY:100}))
    textButton.dispatchEvent(new PointerEvent('pointerup', {bubbles:true,clientX:150,clientY:100}))
    textButton.click()
    check(systemText.hidden === beforeSwipe, 'Swipe activated tile')
    emit('xrimagefound', '22_Element_Air')
    check(runner.getSnapshot().status === 'ACTIVE', 'Wrong marker passed SCAN')
    emit('xrimagefound', '20_Element_Fire', NaN)
    check(runner.getSnapshot().status === 'ACTIVE', 'Invalid pose passed SCAN')
    let hidden = true
    Object.defineProperty(document, 'hidden', {configurable: true, get: () => hidden})
    document.dispatchEvent(new Event('visibilitychange'))
    emit('xrimageupdated', '20_Element_Fire')
    check(runner.getSnapshot().status === 'ACTIVE', 'Hidden-page input accepted')
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    emit('xrimageupdated', '20_Element_Fire')
    check(runner.getSnapshot().status === 'AWAITING_NEXT', 'SCAN did not complete')
    const terminal = document.getElementById('initiation_terminal')
    check(terminal && terminal.object3D.visible, 'SCAN did not spawn terminal')
    check(document.querySelector('.quest-task').textContent.includes('Терминал активирован'), 'Success feedback missing')
    check(document.querySelector('.quest-status').textContent === '1 / 1', 'Progress missing')
    emit('xrimagelost', '20_Element_Fire')
    check(terminal.object3D.visible, 'Marker loss hid terminal before episode completion')
    emit('xrimagefound', '20_Element_Fire', 9)
    scene.components['ar-initiation'].tick(0,10000)
    check(terminal.object3D.position.x === 9, 'Reacquisition did not correct terminal pose')
    check(events.filter(e => e.type === 'mechanic.completed').length === 1, 'Duplicate SCAN completion')
    click('К поиску объекта')
    check(runner.getSnapshot().step.mechanic_id === 'AR-02', 'DISCOVER did not start')
    const frame = document.querySelector('.quest-search-frame')
    const toggle = document.querySelector('.quest-search-toggle')
    const panelContent = document.querySelector('.quest-content')
    check(!frame.hidden && !toggle.hidden && panelContent.hidden, 'Search UI did not collapse')
    check(getComputedStyle(panelContent).display === 'none', 'Collapsed controls remain visible')
    centerButton(toggle); toggle.click()
    check(!panelContent.hidden && frame.hidden && toggle.getAttribute('aria-expanded') === 'true', 'Instructions cannot open')
    centerButton(toggle); toggle.click()
    check(panelContent.hidden && !frame.hidden, 'Cannot return to search')
    const component = scene.components['ar-initiation']
    const beacon = document.getElementById('initiation_beacon')
    check(beacon.object3D.position.x === 9.75, 'Marker-relative offset missing')
    // Use a real THREE camera and meshes with deterministic frame times.
    await new Promise(resolve => setTimeout(resolve, 100))
    const camera = scene.camera
    camera.aspect = 1
    camera.updateProjectionMatrix()
    camera.parent.updateMatrixWorld(true)
    beacon.object3D.updateMatrixWorld(true)
    const target = new AFRAME.THREE.Box3().setFromObject(beacon.object3D).getCenter(new AFRAME.THREE.Vector3())
    camera.lookAt(target)
    for (const t of [0, 100, 200]) component.tick(t)
    camera.lookAt(new AFRAME.THREE.Vector3(-100, 0, -3))
    component.tick(250)
    camera.lookAt(target)
    for (const t of [300, 400, 500, 600, 700]) component.tick(t)
    check(runner.getSnapshot().status === 'ACTIVE', 'Loss of view did not reset dwell')
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    for (const t of [800, 900, 1000, 1100, 1200]) component.tick(t)
    check(runner.getSnapshot().status === 'ACTIVE', 'Hidden page did not reset dwell')
    const blocker = new AFRAME.THREE.Mesh(new AFRAME.THREE.BoxGeometry(2, 2, 0.2), new AFRAME.THREE.MeshBasicMaterial())
    const cameraPosition = camera.getWorldPosition(new AFRAME.THREE.Vector3())
    blocker.position.copy(cameraPosition).lerp(target, 0.5)
    blocker.lookAt(cameraPosition)
    scene.object3D.add(blocker)
    for (const t of [1300, 1400, 1500, 1600, 1700, 1800]) component.tick(t)
    check(runner.getSnapshot().status === 'ACTIVE', 'Occluded target counted as found')
    scene.object3D.remove(blocker)
    blocker.geometry.dispose(); blocker.material.dispose()
    for (const t of [1900, 2000, 2100, 2200, 2300]) component.tick(t)
    check(runner.getSnapshot().status === 'ACTIVE', 'Occlusion did not reset dwell')
    component.tick(2400)
    check(runner.getSnapshot().status === 'AWAITING_NEXT', 'DISCOVER did not confirm continuous observation: ' + JSON.stringify({target: target.toArray(), projected: target.clone().project(camera).toArray(), visible: beacon.object3D.visible, children: beacon.object3D.children.length, aspect: camera.aspect}))
    check(frame.hidden && toggle.hidden && !panelContent.hidden, 'Result did not restore panel')
    click('К активации маяка')
    check(runner.getSnapshot().step.mechanic_id === 'AR-03' && runner.getSnapshot().status === 'ACTIVE', 'TOUCH did not start')
    camera.lookAt(target)
    camera.updateMatrixWorld(true)
    const rect = scene.canvas.getBoundingClientRect()
    const projection = target.clone().project(camera)
    const x = rect.left + (projection.x + 1) * rect.width / 2
    const y = rect.top + (1 - projection.y) * rect.height / 2
    // Keep the fixture panel away from the projected target, without disabling hit testing.
    const ui = document.querySelector('.quest-ui')
    ui.style.cssText = 'bottom:0;left:0'
    const pointer = (type, element = scene.canvas, dx = 0) => element.dispatchEvent(new PointerEvent(type, {bubbles:true, pointerId:1, isPrimary:true, button:0, clientX:x + dx, clientY:y}))
    const tap = (element = scene.canvas) => { pointer('pointerdown', element); pointer('pointerup', element) }
    const originalMaterial = beacon.querySelector('[material]').getObject3D('mesh').material
    tap(ui)
    check(runner.getSnapshot().status === 'ACTIVE', 'UI tap activated object')
    pointer('pointerdown'); pointer('pointermove', scene.canvas, 30); pointer('pointerup')
    check(runner.getSnapshot().status === 'ACTIVE', 'Swipe counted as TOUCH')
    pointer('pointerdown'); pointer('pointercancel'); pointer('pointerup')
    check(runner.getSnapshot().status === 'ACTIVE', 'Cancelled gesture counted')
    hidden = true; document.dispatchEvent(new Event('visibilitychange')); tap()
    hidden = false; document.dispatchEvent(new Event('visibilitychange'))
    check(runner.getSnapshot().status === 'ACTIVE', 'Hidden TOUCH accepted')
    beacon.object3D.visible = false; tap(); beacon.object3D.visible = true
    check(runner.getSnapshot().status === 'ACTIVE', 'Invisible target accepted')
    const touchBlocker = new AFRAME.THREE.Mesh(new AFRAME.THREE.BoxGeometry(2,2,0.2), new AFRAME.THREE.MeshBasicMaterial())
    touchBlocker.position.copy(cameraPosition).lerp(target, 0.5); touchBlocker.lookAt(cameraPosition)
    scene.object3D.add(touchBlocker); tap()
    check(runner.getSnapshot().status === 'ACTIVE', 'TOUCH passed through occluder')
    scene.object3D.remove(touchBlocker); touchBlocker.geometry.dispose(); touchBlocker.material.dispose()
    tap()
    check(runner.getSnapshot().status === 'AWAITING_NEXT', 'Raycast TOUCH did not complete')
    const highlighted = beacon.querySelector('[material]').getObject3D('mesh').material
    check(highlighted !== originalMaterial && highlighted.color.getHexString() === 'a6ffde', 'Object feedback missing')
    tap(); scene.canvas.dispatchEvent(new MouseEvent('click', {bubbles:true, clientX:x, clientY:y}))
    check(events.filter(e => e.type === 'mechanic.completed').length === 3, 'Duplicate TOUCH completion')
    emit('xrimagelost', '20_Element_Fire')
    click('К сбору объектов')
    check(runner.getSnapshot().step.mechanic_id === 'AR-05', 'COLLECT did not start')
    check(document.querySelector('.quest-status').textContent === '0 / 4', 'Initial collection counter missing')
    await new Promise(resolve => setTimeout(resolve, 100))
    for (const [index, number] of [3,1,4,2].entries()) {
      const cell = document.getElementById('initiation_cell_' + number)
      check(cell && cell.object3D.visible, 'Cell failed to spawn from last marker pose')
      scene.object3D.updateMatrixWorld(true)
      const center = new AFRAME.THREE.Box3().setFromObject(cell.object3D).getCenter(new AFRAME.THREE.Vector3())
      camera.aspect = 1; camera.updateProjectionMatrix(); camera.lookAt(center); camera.updateMatrixWorld(true)
      const box = scene.canvas.getBoundingClientRect()
      const p = center.clone().project(camera)
      const touch = type => scene.canvas.dispatchEvent(new PointerEvent(type, {bubbles:true, pointerId:2, isPrimary:true, button:0, clientX:box.left + (p.x+1)*box.width/2, clientY:box.top + (1-p.y)*box.height/2}))
      touch('pointerdown'); touch('pointerup')
      check(!cell.object3D.visible, 'Collected cell remains visible')
      check(document.querySelector('.quest-status').textContent === (index+1) + ' / 4', 'Collection progress wrong')
      runner.input('input.target_touched', {target_id:'cell_'+number, interaction_id:'duplicate-'+number})
      emit('xrimagefound', '20_Element_Fire', 9)
      check(!cell.object3D.visible, 'Collected cell respawned on marker update')
    }
    check(runner.getSnapshot().status === 'AWAITING_NEXT', 'COLLECT did not complete')
    check(events.filter(e => e.type === 'mechanic.completed').length === 4, 'Duplicate COLLECT completion')
    click('К выбору объекта')
    check(runner.getSnapshot().step.mechanic_id === 'AR-06', 'CHOOSE did not start')
    await new Promise(resolve => setTimeout(resolve, 100))
    const choose = name => {
      const panel = document.getElementById('initiation_channel_' + name)
      check(panel && panel.object3D.visible, 'Choice panel missing')
      scene.object3D.updateMatrixWorld(true)
      const center = new AFRAME.THREE.Box3().setFromObject(panel.object3D).getCenter(new AFRAME.THREE.Vector3())
      camera.aspect=1; camera.updateProjectionMatrix(); camera.lookAt(center); camera.updateMatrixWorld(true)
      const rect=scene.canvas.getBoundingClientRect(), p=center.clone().project(camera)
      for(const type of ['pointerdown','pointerup']) scene.canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:3,isPrimary:true,button:0,clientX:rect.left+(p.x+1)*rect.width/2,clientY:rect.top+(1-p.y)*rect.height/2}))
    }
    choose('left')
    check(runner.getSnapshot().status === 'ACTIVE', 'Wrong choice ended onboarding')
    check(document.querySelector('.quest-task').textContent.includes('Попробуйте'), 'Wrong choice feedback missing')
    check(document.querySelector('.quest-status').textContent === 'Ошибок: 1', 'Error counter missing')
    choose('left')
    check(runner.getSnapshot().mechanic.state.attempts === 2, 'New gesture on same wrong target ignored')
    choose('center')
    check(runner.getSnapshot().status === 'AWAITING_NEXT', 'Correct choice did not succeed')
    check(document.querySelector('.quest-task').textContent === 'Верный выбор.', 'Correct choice feedback missing')
    check(events.filter(e => e.type === 'mechanic.completed').length === 5, 'Duplicate CHOOSE completion')
    click('К последовательности')
    check(runner.getSnapshot().step.mechanic_id === 'AR-07', 'SEQUENCE did not start')
    choose('center')
    check(runner.getSnapshot().mechanic.progress.current === 0, 'Early sequence input accepted')
    await new Promise(resolve => setTimeout(resolve, 1100))
    const centerMesh = document.getElementById('initiation_channel_center').querySelector('[material]').getObject3D('mesh')
    check(centerMesh.material.color.getHexString() === 'ffffff', 'Sequence pulse missing')
    const beforePauseToken = runner.getSnapshot().mechanic.state.presentation_token
    hidden=true; document.dispatchEvent(new Event('visibilitychange'))
    check(centerMesh.material.color.getHexString() === '57c9ff', 'Pause did not clear sequence pulse')
    await new Promise(resolve => setTimeout(resolve, 300))
    hidden=false; document.dispatchEvent(new Event('visibilitychange'))
    check(runner.getSnapshot().mechanic.state.presentation_token !== beforePauseToken, 'Resume did not restart presentation')
    const waitInput = async () => {
      for(let i=0;i<80 && runner.getSnapshot().mechanic.state.phase !== 'INPUT';i++) await new Promise(resolve => setTimeout(resolve,100))
      check(runner.getSnapshot().mechanic.state.phase === 'INPUT', 'Presentation never enabled input')
    }
    await waitInput()
    choose('right')
    check(runner.getSnapshot().mechanic.state.phase === 'SHOWING', 'Wrong sequence did not replay')
    check(runner.getSnapshot().mechanic.state.attempts === 1, 'Sequence error count wrong')
    check(document.querySelector('.quest-task').textContent.includes('Посмотрите'), 'Sequence error feedback missing')
    await waitInput()
    choose('center')
    click('Показать ещё раз')
    check(runner.getSnapshot().mechanic.progress.current === 0, 'Manual replay retained partial input')
    await waitInput()
    for(const name of ['center','left','center','right']) choose(name)
    check(runner.getSnapshot().status === 'AWAITING_NEXT', 'Repeated-element sequence did not complete')
    check(runner.getSnapshot().mechanic.state.attempts === 1, 'Replay incorrectly charged an error')
    check(events.filter(e => e.type === 'mechanic.completed').length === 6, 'Duplicate SEQUENCE completion')
    click('Завершить упражнение')
    check(!document.getElementById('initiation_channel_center').object3D.visible, 'Choice panel remained after completion')
    check(beacon.querySelector('[material]').getObject3D('mesh').material === originalMaterial, 'Highlight was not restored')
    check(runner.getSnapshot().status === 'COMPLETE', 'Scenario did not complete')
    check(!terminal.object3D.visible, 'Episode completion did not hide object')
    emit('xrimageupdated', '20_Element_Fire')
    check(!terminal.object3D.visible, 'Completed object reappeared')
    emit('xrimagelost', '20_Element_Fire')
    const previousRun = runner.getSnapshot().run_id
    click('Начать заново')
    check(runner.getSnapshot().status === 'ACTIVE' && runner.getSnapshot().run_id !== previousRun, 'Restart failed')
    emit('xrimagefound', '20_Element_Fire')
    check(document.querySelectorAll('#initiation_terminal').length === 1, 'Duplicate AR terminal')
    check(events.filter(e => e.type === 'mechanic.completed').length === 7, 'Restart did not get a new result')
    click('Начать заново')
    check(runner.getSnapshot().status === 'AWAITING_NEXT', 'Existing visible marker ignored after restart')
    check(events.filter(e => e.type === 'mechanic.completed').length === 8, 'Visible marker caused duplicate restart completion')
    scene.removeAttribute('ar-initiation')
    check(runner.getSnapshot().status === 'DISPOSED', 'Runner not disposed')
    check(!document.querySelector('.quest-ui') && !document.getElementById('initiation_terminal'), 'Scene cleanup failed')
    check(!document.querySelector('.quest-search-frame'), 'Search frame leaked after cleanup')
    const before = events.length
    emit('xrimageupdated', '20_Element_Fire')
    check(events.length === before, 'Old listeners still active')
    scene.setAttribute('ar-initiation', '')
    check(document.querySelectorAll('.quest-ui').length === 1, 'Fresh run duplicated UI')
    check(scene.components['ar-initiation'].runner.getSnapshot().status === 'ACTIVE', 'Fresh run inherited progress')
    scene.removeAttribute('ar-initiation')
    document.getElementById('result').textContent = 'PASS: SCAN, DISCOVER, TOUCH, COLLECT, CHOOSE, SEQUENCE, UI filtering, swipe/cancel, occlusion, continuous visibility, wrong marker, pause, feedback, AR persistence, relocalization, completion, restart, cleanup'
  } catch (error) { document.getElementById('result').textContent = 'FAIL: ' + error.stack }
}, {once: true})
</script></body></html>`)
const browser = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const result = spawnSync(browser, [
  '--headless', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
  '--user-data-dir=' + path.join(out, 'profile'), '--dump-dom', '--virtual-time-budget=30000',
  pathToFileURL(path.join(out, 'index.html')).href + (process.argv.includes('--tracking') ? '?tracking=1' : ''),
], {encoding: 'utf8', timeout: 45000, maxBuffer: 4 * 1024 * 1024})
const status = (result.stdout || '').match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1]
if (!status?.startsWith('PASS:')) fs.writeFileSync(path.join(out, 'failure.html'), result.stdout || result.stderr || '')
console.log(status || result.error || result.stderr || 'Browser produced no test result')
process.exitCode = status?.startsWith('PASS:') ? 0 : 1
