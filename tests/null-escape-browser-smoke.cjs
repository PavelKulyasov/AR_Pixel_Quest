// Actual A-Frame and DOM, simulated XR events. Does not test camera recognition.
const fs = require('node:fs')
const path = require('node:path')
const {pathToFileURL} = require('node:url')
const {spawnSync} = require('node:child_process')
const babel = require('@babel/core')
const root = path.resolve(__dirname, '..')
const out = path.join(root, 'tmp', 'null-escape-smoke')
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
const entry = collect(path.join(root, 'games/pixel-quest/episodes/null-escape/component.js'))
const bundle = '(function(){const factories={' + [...modules].map(([id, code]) =>
  JSON.stringify(id) + ':function(module,exports,require){' + code + '}').join(',') +
  '};const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};factories[id](m,m.exports,require)}return cache[id].exports};window.nullEscapeComponent=require(' +
  JSON.stringify(entry) + ').nullEscapeComponent;})();'
fs.writeFileSync(path.join(out, 'bundle.js'), bundle)
fs.writeFileSync(path.join(out, 'model-fixtures.js'), 'window.propFiles=' + JSON.stringify(Object.fromEntries(['Nulik','button','portal','terminal'].map(name => ['assets/'+name+'-mobile.glb', 'data:model/gltf-binary;base64,'+fs.readFileSync(path.join(root,'games/pixel-quest/assets',name+'-mobile.glb')).toString('base64')]))) + ';')
const aframe = pathToFileURL(path.join(root, 'external/scripts/8frame-1.5.0.min.js')).href
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html><head><meta charset="utf-8">
<style>${fs.readFileSync(path.join(root, "platform/ui/quest-ui.css"), "utf8")}${fs.readFileSync(path.join(root, "games/pixel-quest/styles.css"), "utf8")}</style><script src="${aframe}"></script><script src="./bundle.js"></script><script src="./model-fixtures.js"></script>
</head><body><pre id="result">PENDING</pre>
<script>
window.addEventListener('error', event => { document.getElementById('result').textContent = 'FAIL: ' + event.message })
window.XR8 = {}
// ImageBitmap worker decoding is not synchronized with Chrome virtual time.
window.createImageBitmap = undefined
const modelDiagnostics=[]
const originalError=console.error
console.error=(...args)=>{modelDiagnostics.push(args.map(String).join(' ').slice(0,400));originalError(...args)}
window.addEventListener('unhandledrejection',event=>modelDiagnostics.push(String(event.reason)))
// file:// fixtures cannot fetch GLBs in every Chrome version; feed the real asset bytes to the loader.
const propFiles = window.propFiles
AFRAME.THREE.DefaultLoadingManager.setURLModifier(url => {modelDiagnostics.push(url.slice(0,120));return propFiles[url] || url})
AFRAME.registerComponent('null-escape', window.nullEscapeComponent)
const scene = document.createElement('a-scene')
scene.setAttribute('embedded', '')
scene.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh'
scene.innerHTML = '<a-camera position="0 0 4"></a-camera>'
document.body.appendChild(scene)
const check = (condition, message) => { if (!condition) throw new Error(message) }
scene.addEventListener('loaded', async () => {
  // Real meshes/raycast and lifecycle; visual rendering is checked separately in the model preview.
  scene.renderer.render = () => {}
 try {
  scene.setAttribute('null-escape', '')
  const component = scene.components['null-escape'], runner = component.runner
  const events=[];runner.on('*',e=>events.push(e))
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
  const click=label=>{
    const button=[...document.querySelectorAll('.quest-panel button')].find(b=>b.textContent===label)
    check(button,'Missing '+label)
    const rail=document.querySelector('.quest-carousel'),r=rail.getBoundingClientRect(),b=button.getBoundingClientRect()
    rail.scrollTo({left:rail.scrollLeft+b.left+b.width/2-r.left-r.width/2,behavior:'instant'})
    rail.dispatchEvent(new Event('scroll'));button.click()
  }
  const marker=(type='xrimageupdated',x=0)=>scene.emit(type,{name:'20_Element_Fire',position:{x,y:1,z:-1},rotation:{x:0,y:0,z:0,w:1},scale:1},false)
  check(runner.getSnapshot().status==='READY','Started without START')
  document.querySelector('a-camera').setAttribute('position', '.75 1.4 0')

  await wait(100);click('Начать');marker('xrimagefound')
  check(runner.getSnapshot().step_id==='red_button','SCAN did not advance')
  component.tick(0)
  const loadingNotice=document.querySelector('.null-model-status')
  check(!loadingNotice.hidden && loadingNotice.textContent.includes('Загружается'),'Slow model has no loading notice')
  const loadingModel=document.getElementById('null_escape_null').querySelector('[data-nulik-model]')
  loadingModel.emit('model-error', {format:'gltf'}, false);component.tick(0)
  check(!loadingNotice.hidden && loadingNotice.textContent.includes('Не удалось'),'Model error silently retains the old character')
  await wait(100)
  check(!document.querySelector('.quest-character').hidden,'Dialogue is hidden')
  const terminal=document.getElementById('null_escape_terminal')
  const button=document.getElementById('null_escape_red_button')
  const actor=document.getElementById('null_escape_null')
  check(terminal.object3D.visible && button.object3D.visible && actor.object3D.visible,'Missing scene objects')
  for(let i=0;i<300 && [terminal,button].some(el=>el.firstElementChild.object3D.userData.propLoadStatus!=='ready');i++) await wait(100)
  for(const el of [terminal,button]) {
    check(el.firstElementChild.object3D.userData.propLoadStatus==='ready','Prop GLB did not load')
    check(el.querySelector('[data-prop-model]').getObject3D('mesh'),'Prop has no real mesh')
    check(!el.querySelector('a-box'),'Test geometry retained in prop')
  }
  for (let i=0;i<100 && !actor.firstElementChild.object3D.userData.nulik?.fitted;i++) { await wait(100); component.tick(0) }
  const modelData=actor.firstElementChild.object3D.userData.nulik
  check(modelData?.fitted,'Nulik GLB did not load or fit: mesh='+!!actor.querySelector('[data-nulik-model]').getObject3D('mesh')+', bounds='+!!modelData+', loader='+modelDiagnostics.join('; '))
  check(actor.querySelector('[data-nulik-model]').getObject3D('mesh'),'Nulik mesh absent')
  check(loadingNotice.hidden,'Successful GLB load did not clear the notice')
  check(!actor.querySelector('a-box'),'Old test geometry remains in Nulik')
  check(Object.keys(modelData.parts).length===4,'Full Nulik does not contain four real parts')
  const animatedHead=modelData.parts.head.pivot.children[0]
  modelData.animate(0)
  const restHead=animatedHead.position.clone()
  let motion=0
  for(const t of [.25,.5,1,1.5,2]) {modelData.animate(t);motion=Math.max(motion,animatedHead.position.distanceTo(restHead))}
  check(motion>1e-5,'Embedded levitation did not move the model')
  modelData.animate(0)
  const originalModelScale=modelData.frame.scale.x
  await wait(1000);component.tick(0)
  check(!modelData.parts.head.pivot.quaternion.equals(modelData.parts.head.quaternion),'Speaking head has no gesture')
  check(!modelData.parts.left_arm.pivot.quaternion.equals(modelData.parts.left_arm.quaternion),'Speaking hand has no gesture')
  const projectedSize=()=>{
    scene.object3D.updateMatrixWorld(true);scene.camera.updateMatrixWorld(true)
    const bounds=modelData.framingBounds.clone().applyMatrix4(modelData.frame.matrixWorld)
    const points=[]
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new AFRAME.THREE.Vector3(x,y,z).project(scene.camera))
    return Math.max(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))/2
  }
  // Dividing the requested 2x scale must recover the previous 35% framing.
  modelData.frame.scale.setScalar(originalModelScale / 2)
  check(projectedSize()<=.351 && projectedSize()>=.34,'Close portrait framing is not 35%: '+JSON.stringify({screen:projectedSize(),extent:modelData.extent,scale:modelData.frame.scale.x,local:modelData.bounds,world:new AFRAME.THREE.Box3().setFromObject(modelData.frame),camera:scene.camera.getWorldPosition(new AFRAME.THREE.Vector3()),aspect:scene.camera.aspect,actor:actor.object3D.position}))
  modelData.frame.scale.setScalar(originalModelScale)
  document.querySelector('a-camera').setAttribute('position', '0 0 4')
  scene.camera.aspect=scene.canvas.clientWidth/scene.canvas.clientHeight;scene.camera.updateProjectionMatrix()
  component.tick(0)
  check(modelData.frame.scale.x===originalModelScale,'Camera movement changed calibrated size')
  scene.emit('xrimagelost',{name:'20_Element_Fire'},false)
  check(terminal.object3D.visible,'Marker loss hid scene')
  const tap=()=>{
    scene.object3D.updateMatrixWorld(true)
    const target=new AFRAME.THREE.Box3().setFromObject(button.object3D).getCenter(new AFRAME.THREE.Vector3())
    const camera=scene.camera;camera.lookAt(target);camera.updateMatrixWorld(true)
    const rect=scene.canvas.getBoundingClientRect(),p=target.clone().project(camera)
    for(const type of ['pointerdown','pointerup'])scene.canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:rect.left+(p.x+1)*rect.width/2,clientY:rect.top+(1-p.y)*rect.height/2}))
  }
  tap();check(runner.getSnapshot().mechanic.progress.current===0,'Early pointer passed')
  await wait(10000)
  check(runner.getSnapshot().scene_phase==='ACTIVE','Warning sequence did not finish')
  const anchor=button.object3D.position.clone()
  component.tick(0);check(button.object3D.position.equals(anchor),'Pulse moved anchor')
  tap();check(runner.getSnapshot().scenario_state==='ACCIDENT','Raycast did not activate button')
  const oldRun=runner.getSnapshot().run_id
  await wait(12300);component.tick(0)
  check(Object.values(modelData.parts).every(part=>part.pivot.position.distanceTo(part.position)>.05),'Portal did not separate all four parts')
  const separatedHead=modelData.parts.head.pivot.position.clone()
  const fixedAnchor=actor.object3D.position.clone()
  await wait(300);component.tick(0)
  check(modelData.parts.head.pivot.position.distanceTo(separatedHead)>.05,'Separated head is not moving toward portal')
  check(actor.object3D.position.equals(fixedAnchor),'Breakup moved marker anchor')
  click('Повторить сцену')
  check(Object.values(modelData.parts).every(part=>part.pivot.position.equals(part.position) && part.pivot.quaternion.equals(part.quaternion) && part.pivot.scale.equals(part.scale)),'Retry retained exploded pose')
  check(runner.getSnapshot().run_id!==oldRun && runner.getSnapshot().history.length===1,'Retry lost SCAN')
  check(actor.object3D.visible,'Retry did not restore actor')
  check(modelData.frame.scale.x===originalModelScale,'Retry changed Nulik scale')
  let hidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden})
  document.dispatchEvent(new Event('visibilitychange'))
  component.tick(0)
  const pausedGesture=modelData.parts.head.pivot.quaternion.clone()
  const pausedLevitation=animatedHead.position.clone()
  const time=runner.getTime();await wait(2000);component.tick(0)
  check(animatedHead.position.equals(pausedLevitation),'Levitation advanced during pause')
  check(modelData.parts.head.pivot.quaternion.equals(pausedGesture),'Speech gesture advanced during pause')
  check(runner.getTime()===time,'Background time advanced')
  hidden=false;document.dispatchEvent(new Event('visibilitychange'))
  await wait(10000);tap();await wait(7500)
  check(document.getElementById('null_escape_portal')?.object3D.visible,'Portal absent')
  check(document.getElementById('null_escape_portal').firstElementChild.object3D.userData.propLoadStatus==='ready','Portal GLB not loaded')
  await wait(4800);component.tick(0)
  const pausedParts=Object.values(modelData.parts).map(part=>part.pivot.position.clone())
  hidden=true;document.dispatchEvent(new Event('visibilitychange'))
  await wait(1000);component.tick(0)
  check(Object.values(modelData.parts).every((part,i)=>part.pivot.position.equals(pausedParts[i])),'Portal breakup advanced in background')
  hidden=false;document.dispatchEvent(new Event('visibilitychange'))
  await wait(1200)
  check(runner.getSnapshot().step_id==='discover_null','DISCOVER did not follow accident')
  check(!actor.object3D.visible && terminal.object3D.visible,'Search scene incorrectly restored full actor')
  await wait(7500)
  const head=document.getElementById('null_escape_null_head')
  const frame=document.querySelector('.quest-search-frame')
  const hint=document.querySelector('.quest-search-hint')
  check(head?.object3D.visible && !frame.hidden,'Search target/frame absent')
  const headData=head.firstElementChild.object3D.userData.nulik
  check(headData?.selectedPart==='head' && Object.keys(headData.parts).length===1 && !head.querySelector('a-box'),'Search head is not from the GLB')
  const modelPartMaterial=(element,part)=>element.firstElementChild.object3D.userData.nulik.parts[part].pivot.children[0].material
  check(modelPartMaterial(head,'head').map===modelData.parts.head.pivot.children[0].material.map,'Head does not share the character texture')
  check(document.querySelector('.quest-content').hidden,'Search panel did not collapse')
  const camera=scene.camera
  camera.lookAt(new AFRAME.THREE.Vector3(-100,0,0));camera.updateMatrixWorld(true)
  await wait(16000)
  check(hint.textContent.includes('рядом'),'First hint missing in collapsed UI')
  await wait(10000);component.tick(100)
  check(/←|→|↑|↓/.test(hint.textContent),'Directional hint missing')
  await wait(15000);component.tick(200)
  check(hint.textContent.includes('светящуюся'),'Escalated hint absent')
  check(modelPartMaterial(head,'head').color.getHexString()==='ffffff','Head not highlighted')
  const center=new AFRAME.THREE.Box3().setFromObject(head.object3D).getCenter(new AFRAME.THREE.Vector3())
  camera.lookAt(center);camera.updateMatrixWorld(true)
  for(const t of [1000,1100,1200]) component.tick(t)
  camera.lookAt(new AFRAME.THREE.Vector3(-100,0,0));component.tick(1300)
  camera.lookAt(center)
  for(const t of [1400,1500,1600,1700,1800]) component.tick(t)
  check(runner.getSnapshot().scene_phase==='ACTIVE','Interrupted dwell counted')
  component.tick(1900)
  check(runner.getSnapshot().scenario_state==='NULL_FOUND','Continuous visibility did not find head')
  check(frame.hidden && !document.querySelector('.quest-content').hidden,'Found dialogue panel not restored')
  check(runner.getSnapshot().scene_phase==='PRESENTING','Found scene did not present dialogue')
  click('Повторить сцену')
  check(runner.getSnapshot().step_id==='discover_null' && runner.getSnapshot().history.length===2,'Search retry lost previous scenes')
  // A visible target during PREPARING must not consume adapter confirmation.
  head.object3D.visible=true
  for(const t of [2000,2100,2200,2300,2400,2500]) component.tick(t)
  check(runner.getSnapshot().scene_phase==='PREPARING','Early DISCOVER accepted')
  head.object3D.visible=false
  camera.lookAt(new AFRAME.THREE.Vector3(-100,0,0))
  await wait(7500)
  check(head.object3D.visible,'Final retry lost cached marker pose')
  check(!hint.textContent.includes('светящуюся'),'Hint level leaked into retry')
  camera.lookAt(center)
  for(const t of [3000,3100,3200,3300,3400,3500]) component.tick(t)
  check(runner.getSnapshot().scenario_state==='NULL_FOUND','Preparation poisoned subsequent discovery')
  await wait(5500)
  check(runner.getSnapshot().step_id==='collect_parts','COLLECT did not follow DISCOVER')
  runner.input('input.target_touched',{target_id:'null_body',interaction_id:'early'})
  check(runner.getSnapshot().mechanic.progress.current===0,'Early collection accepted')
  await wait(12000)
  check(document.querySelector('.quest-status').textContent==='0 / 3','Initial count absent')
  for(const part of ['body','left_arm','right_arm']) {
    const element=document.getElementById('null_escape_null_'+part)
    const data=element.firstElementChild.object3D.userData.nulik
    check(data?.selectedPart===part && Object.keys(data.parts).length===1 && !element.querySelector('a-box'),'Collect target is not the authored part: '+part)
    component.tick(0)
    check(Math.abs(data.frame.scale.x-originalModelScale)<1e-8,'Part proportions do not match full model: '+part)
  }
  check(!document.getElementById('null_escape_null_energy_module'),'Old energy placeholder still exists')
  const collect=(id)=>{
    const part=document.getElementById('null_escape_'+id)
    check(part?.object3D.visible,'Missing part '+id)
    scene.object3D.updateMatrixWorld(true)
    const target=new AFRAME.THREE.Box3().setFromObject(part.object3D).getCenter(new AFRAME.THREE.Vector3())
    document.querySelector('a-camera').object3D.position.copy(target).add(new AFRAME.THREE.Vector3(0,0,4))
    scene.object3D.updateMatrixWorld(true)
    camera.lookAt(target);camera.updateMatrixWorld(true)
    const rect=scene.canvas.getBoundingClientRect(),p=target.clone().project(camera)
    for(const type of ['pointerdown','pointerup'])scene.canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:5,isPrimary:true,button:0,clientX:rect.left+(p.x+1)*rect.width/2,clientY:rect.top+(1-p.y)*rect.height/2}))
    check(!part.object3D.visible,'Collected part remains visible '+id)
  }
  collect('null_body')
  check(document.querySelector('.quest-status').textContent==='1 / 3','Counter not updated')
  check(document.querySelector('.quest-system').textContent.includes('Двигатель ✓'),'Checklist not updated')
  click('Повторить сцену');check(runner.getSnapshot().history.length===3,'COLLECT retry lost progress')
  await wait(12200)
  check(document.getElementById('null_escape_null_body').object3D.visible,'Retry did not restore collected part')
  check(document.querySelector('.quest-status').textContent==='0 / 3','Retry retained partial count')
  await wait(30100)
  check(modelPartMaterial(document.getElementById('null_escape_null_body'),'body').color.getHexString()==='ffffff','Remaining parts not highlighted')
  for(const [index,id] of ['null_right_arm','null_body','null_left_arm'].entries()) {
    collect(id)
    runner.input('input.target_touched',{target_id:id,interaction_id:'duplicate-'+id})
    marker('xrimagefound')
    check(!document.getElementById('null_escape_'+id).object3D.visible,'Collected part respawned on marker update')
    check(document.querySelector('.quest-status').textContent===(index+1)+' / 3','Collection count incorrect')
  }
  document.querySelector('a-camera').setAttribute('position','0 0 4')
  scene.object3D.updateMatrixWorld(true)
  check(runner.getSnapshot().scene_phase==='PRESENTING','Assembly did not start')
  check(document.getElementById('null_escape_null_assembled')?.object3D.visible,'Assembled model absent')
  check(!head.object3D.visible,'Detached head remains during assembly')
  await wait(8200)
  const assembledData=document.getElementById('null_escape_null_assembled').firstElementChild.object3D.userData.nulik
  check(assembledData?.fitted && Math.abs(assembledData.frame.scale.x-originalModelScale)<1e-8,'Assembled Nulik did not reuse initial size')
  check(runner.getSnapshot().step_id==='choose_core','CHOOSE did not follow collection')
  runner.input('input.target_touched',{target_id:'core_03',interaction_id:'early-core'})
  check(runner.getSnapshot().mechanic.progress.current===0,'Early CHOOSE accepted')
  await wait(11300)
  const core=id=>document.getElementById('null_escape_'+id)
  check(['core_01','core_02','core_03','core_04'].every(id=>core(id)?.object3D.visible),'Missing cores')
  const visual=core('core_03').firstElementChild.object3D
  const scales=[];const coreAnchor=core('core_03').object3D.position.clone()
  for(let i=0;i<24;i++){await wait(100);component.tick(0);scales.push(visual.scale.x)}
  check(Math.max(...scales)-Math.min(...scales)>.2,'Core pattern is not animating: '+scales.join(','))
  check(core('core_03').object3D.position.equals(coreAnchor),'Pulse moved marker anchor')
  const choose=id=>{
    scene.object3D.updateMatrixWorld(true)
    const target=new AFRAME.THREE.Box3().setFromObject(core(id).object3D).getCenter(new AFRAME.THREE.Vector3())
    camera.lookAt(target);camera.updateMatrixWorld(true)
    const rect=scene.canvas.getBoundingClientRect(),p=target.clone().project(camera)
    for(const type of ['pointerdown','pointerup'])scene.canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:6,isPrimary:true,button:0,clientX:rect.left+(p.x+1)*rect.width/2,clientY:rect.top+(1-p.y)*rect.height/2}))
  }
  choose('core_01');choose('core_01')
  check(runner.getSnapshot().scene_phase==='ACTIVE' && runner.getSnapshot().mechanic.state.attempts===2,'Wrong choices ended play')
  check(document.querySelector('.quest-character').textContent.includes('Ничего страшного'),'Wrong choice dialogue absent')
  check(core('core_01').querySelector('a-box').getObject3D('mesh').material.color.getHexString()==='82796c','Wrong choice visual feedback absent')
  let t=runner.getTime();hidden=true;document.dispatchEvent(new Event('visibilitychange'))
  component.tick(0);const pausedScale=visual.scale.x;await wait(1000);component.tick(0)
  check(runner.getTime()===t && visual.scale.x===pausedScale,'Paused pattern advanced')
  hidden=false;document.dispatchEvent(new Event('visibilitychange'))
  click('Повторить сцену')
  check(runner.getSnapshot().history.length===4,'CHOOSE retry lost previous results')
  await wait(11300)
  check(core('core_01').querySelector('a-box').getObject3D('mesh').material.color.getHexString()==='ffc857','Retry retained wrong feedback')
  choose('core_03')
  check(runner.getSnapshot().scenario_state==='CORE_FOUND','Correct core rejected')
  check(core('core_03').querySelector('a-box').getObject3D('mesh').material.color.getHexString()==='a6ffde','Correct core feedback absent')
  await wait(5100)
  check(runner.getSnapshot().step_id==='portal_sequence','SEQUENCE did not follow CHOOSE')
  await wait(5200)
  const symbol=id=>document.getElementById('null_escape_symbol_'+id)
  const press=id=>{
    scene.object3D.updateMatrixWorld(true)
    const target=new AFRAME.THREE.Box3().setFromObject(symbol(id).object3D).getCenter(new AFRAME.THREE.Vector3())
    camera.lookAt(target);camera.updateMatrixWorld(true)
    const rect=scene.canvas.getBoundingClientRect(),p=target.clone().project(camera)
    for(const type of ['pointerdown','pointerup'])scene.canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:7,isPrimary:true,button:0,clientX:rect.left+(p.x+1)*rect.width/2,clientY:rect.top+(1-p.y)*rect.height/2}))
  }
  check(['diamond','circle','triangle','square'].every(id=>symbol(id)?.object3D.visible),'Symbols absent')
  press('diamond');check(runner.getSnapshot().mechanic.progress.current===0,'Showing accepted early tap')
  await wait(1000)
  check(symbol('diamond').firstElementChild.firstElementChild.getObject3D('mesh').material.color.getHexString()==='ffffff','First symbol not highlighted')
  check(document.querySelector('.quest-status').textContent.includes('1 / 3'),'Display counter off by one')
  hidden=true;document.dispatchEvent(new Event('visibilitychange'));await wait(1000)
  check(symbol('diamond').firstElementChild.firstElementChild.getObject3D('mesh').material.color.getHexString()==='57c9ff','Pause retained highlight')
  hidden=false;document.dispatchEvent(new Event('visibilitychange'))
  const waitInput=async()=>{
    for(let i=0;i<70 && runner.getSnapshot().mechanic.state.phase!=='INPUT';i++)await wait(100)
    check(runner.getSnapshot().mechanic.state.phase==='INPUT','Sequence presentation stuck')
  }
  await waitInput();press('square')
  check(runner.getSnapshot().mechanic.state.attempts===1 && runner.getSnapshot().mechanic.state.phase==='SHOWING','Wrong input did not replay')
  check(document.querySelector('.quest-character').textContent.includes('Почти'),'Wrong sequence dialogue absent')
  await waitInput();press('diamond');click('Показать ещё раз')
  check(runner.getSnapshot().mechanic.progress.current===0,'Replay did not clear partial input')
  check(runner.getSnapshot().mechanic.state.attempts===1,'Replay charged error')
  await waitInput()
  for(const id of ['diamond','triangle','circle'])press(id)
  check(runner.getSnapshot().scenario_state==='SEQUENCE_SOLVED','Correct sequence did not succeed')
  check(document.querySelector('.quest-status').textContent==='3 / 3','Input count incorrect')
  await wait(6200)
  check(runner.getSnapshot().step_id==='portal_finale','Finale did not follow SEQUENCE')
  const waitCommand=async predicate=>{
    for(let i=0;i<600;i++) {
      const match=events.find(e=>e.type==='scene.command' && e.run_id===runner.getSnapshot().run_id && predicate(e.payload.command))
      if(match){component.tick(0);return}
      await wait(100)
    }
    throw Error('Finale command timed out')
  }
  const waitLine=id=>waitCommand(c=>c.type==='dialogue' && c.id===id)
  const board=document.getElementById('null_escape_terminal_display').firstElementChild.object3D
  const boardMesh=board.children[0]
  let released=0
  for(const resource of [boardMesh.geometry,boardMesh.material,boardMesh.material.map])resource.addEventListener('dispose',()=>released++)
  await waitLine('stability_99')
  check(board.userData.terminalText==='99%','AR terminal stability missing')
  hidden=true;document.dispatchEvent(new Event('visibilitychange'));const pauseTime=runner.getTime();await wait(2000)
  check(runner.getTime()===pauseTime,'Finale advanced in background')
  hidden=false;document.dispatchEvent(new Event('visibilitychange'))
  await waitCommand(c=>c.type==='show' && c.target==='anomaly_silhouette')
  check(document.getElementById('null_escape_anomaly_silhouette').object3D.visible,'Silhouette absent')
  check(!document.querySelector('.null-escape-glitch').hidden,'Glitch missing')
  await waitLine('did_you_see')
  check(!document.getElementById('null_escape_anomaly_silhouette').object3D.visible,'Silhouette did not vanish')
  check(document.querySelector('.null-escape-glitch').hidden,'Glitch persists')
  await waitLine('thanks_access')
  check(board.userData.terminalText.includes('СПАСИБО ЗА'),'Terminal message absent')
  await waitLine('see_you');check(board.userData.terminalText==='УВИДИМСЯ.','Second terminal message missing')
  await waitCommand(c=>c.type==='hide' && c.target==='portal')
  marker('xrimagefound');check(!document.getElementById('null_escape_portal').object3D.visible,'Closed portal reappeared')
  await waitLine('connection_established')
  check(document.querySelector('.quest-task').textContent==='СВЯЗЬ УСТАНОВЛЕНА','Connection twist missing')
  await waitLine('ending_uneasy');await wait(3600)
  check(runner.getSnapshot().status==='COMPLETE' && runner.getSnapshot().scenario_state==='COMPLETED','Full story did not finish')
  check(document.querySelector('.quest-task').textContent==='ОБУЧЕНИЕ ЗАВЕРШЕНО','Final UI missing')
  click('Повторить сцену')
  check(runner.getSnapshot().history.length===6 && runner.getSnapshot().step_id==='portal_finale','Final retry lost mechanics')
  component.tick(0);check(board.userData.terminalText==='','Retry retained terminal text')
  await waitCommand(c=>c.type==='show' && c.target==='anomaly_silhouette')
  click('Повторить сцену')
  check(document.querySelector('.null-escape-glitch').hidden,'Retry retained glitch')
  check(!document.getElementById('null_escape_anomaly_silhouette').object3D.visible,'Retry retained silhouette')
  marker('xrimagefound',.5)
  component.tick(0,10000)
  check(terminal.object3D.position.x===.5,'Reacquisition not applied')
  check(document.querySelectorAll('#null_escape_terminal').length===1,'Duplicate objects')
  scene.removeAttribute('null-escape')
  const count=events.length;await wait(1000)
  check(events.length===count && runner.getSnapshot().status==='DISPOSED','Timers survive dispose')
  check(released===3,'Terminal GPU resources leaked')
  check(modelDiagnostics.filter(url=>url==='assets/Nulik-mobile.glb').length===1,'Character parts downloaded the GLB more than once')
  for(const name of ['button','portal','terminal']) check(modelDiagnostics.filter(url=>url==='assets/'+name+'-mobile.glb').length===1,'Prop loaded more than once: '+name)
  check(!document.querySelector('.null-prop-status'),'Prop loading notice leaked')
  check(!document.querySelector('.null-escape-glitch'),'Glitch overlay leaked')
  check(!document.querySelector('.null-model-status'),'Model loading notice leaked')
  check(!document.querySelector('.quest-ui') && !document.getElementById('null_escape_terminal'),'Cleanup failed')
  document.getElementById('result').textContent='PASS: Null Escape START, SCAN, readable dialogue, early input gate, raycast TOUCH, accident, portal, pause, retry, marker loss/reacquisition, DISCOVER, progressive hints, continuous visibility, preparation gate, COLLECT raycast, checklist, part persistence, assembly, CHOOSE patterns, wrong/correct choices, SEQUENCE display, wrong/replay, pause, finale, terminal text, anomaly, ending, final retry, GPU cleanup'
 } catch(error){document.getElementById('result').textContent='FAIL: '+error.stack}
}, {once:true})
</script></body></html>`)
const browser = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const result = spawnSync(browser, [
  '--headless', '--window-size=390,844', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
  '--user-data-dir=' + path.join(out, 'profile-' + process.pid), '--dump-dom', '--virtual-time-budget=400000',
  pathToFileURL(path.join(out, 'index.html')).href,
], {encoding: 'utf8', timeout: 80000, maxBuffer: 4 * 1024 * 1024})
const status = (result.stdout || '').match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1]
if (!status?.startsWith('PASS:')) fs.writeFileSync(path.join(out, 'failure.html'), result.stdout || result.stderr || '')
console.log(status || result.error || result.stderr || 'Browser produced no test result')
process.exitCode = status?.startsWith('PASS:') ? 0 : 1
