const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const babel = require('@babel/core')

// Load the existing webpack ES modules without changing the project's module type.
const cache = new Map()
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = {exports: {}}
  cache.set(filename, module)
  const {code} = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, presets: [['@babel/preset-env', {targets: {node: 'current'}, modules: 'commonjs'}]],
  })
  vm.runInNewContext(code, {
    module, exports: module.exports, console,
    require: name => load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.js'))),
  }, {filename})
  return module.exports
}
const {createEpisodeController} = load('src/episodes/episode-01/controller.js')
const {createMarkerManager} = load('src/game/marker-manager.js')
const {episode, getView} = load('src/episodes/episode-01/config.js')
const fixture = (sink) => {
  const events = []
  const controller = createEpisodeController({sink: sink || (payload => events.push(payload))})
  controller.start()
  return {controller, state: controller.state, events}
}
function reachFile(c) {
  c.detect('MARKER_01')
  c.action('YES')
  c.action('NEXT')
  c.detect('MARKER_02')
  c.action('CONFIRM_LOG')
  c.action('NEXT')
  c.detect('MARKER_03')
}
test('locks prevent early detection, forged interactions and unknown targets', () => {
  const {controller: c, state, events} = fixture()
  for (const id of ['MARKER_02', 'MARKER_03', 'UNKNOWN', '__proto__']) assert.equal(c.detect(id), false)
  for (const action of ['NEXT', 'YES', 'CONFIRM_LOG', 'CONFIRM_FILE']) assert.equal(c.action(action), false)
  assert.equal(state.step, 'SEARCH_CHARACTER')
  assert.equal(events.length, 1)
})
test('NO loops; YES and acknowledgments unlock markers in order', () => {
  const {controller: c, state, events} = fixture()
  c.detect('MARKER_01')
  c.action('NO')
  c.action('NO')
  assert.equal(state.step, 'WAITING_CHARACTER_ANSWER')
  assert.equal(state.characterInteracted, false)
  assert.equal(state.markers.MARKER_02, 'LOCKED')
  assert.match(getView(state).character, /Тогда почему вы смотрите прямо на меня\?/)
  c.action('YES')
  c.action('NEXT')
  assert.equal(state.characterInteracted, true)
  assert.equal(state.markers.MARKER_01, 'COMPLETED')
  assert.equal(state.markers.MARKER_02, 'AVAILABLE')
  assert.equal(events.filter(e => e.event === 'character_interaction').length, 1)
})
test('full flow, canonical intrusion order and exactly-once completion', () => {
  const {controller: c, state, events} = fixture()
  reachFile(c)
  assert.equal(state.logRead, true)
  assert.equal(state.fileRead, false)
  c.action('CONFIRM_FILE')
  c.action('NEXT')
  for (const line of episode.intrusion) {
    assert.equal(getView(state).system, line)
    c.action('NEXT')
  }
  assert.equal(getView(state).character, 'До следующей встречи.')
  assert.equal(state.completed, false)
  c.action('NEXT')
  for (let i = 0; i < 10; i += 1) {
    c.action('NEXT')
    c.detect('MARKER_01')
    c.detect('MARKER_02')
    c.detect('MARKER_03')
  }
  assert.equal(state.step, 'EPISODE_COMPLETE')
  assert.equal(state.completed, true)
  assert.equal(state.fileRead, true)
  assert.ok(Object.values(state.markers).every(value => value === 'COMPLETED'))
  for (const name of ['episode_started', 'marker_01_found', 'character_interaction', 'character_answer_yes',
    'marker_02_found', 'log_opened', 'admin_access_seen', 'marker_03_found', 'file_opened',
    'anomaly_intervention', 'episode_completed']) {
    assert.equal(events.filter(e => e.event === name).length, 1, name)
  }
  assert.ok(events.every(e => e.episode === 1 && e.currentStep && Number.isFinite(e.timestamp)))
})
test('tracking loss and repeated updates preserve progress without repeating story', () => {
  const {controller: c, state, events} = fixture()
  const scene = new EventTarget()
  let updates = 0
  let losses = 0
  const manager = createMarkerManager(scene, episode.targets, {
    found: id => c.detect(id), updated: () => updates++, lost: () => losses++,
  })
  const emit = (type, name = '20_Element_Fire') => scene.dispatchEvent(new CustomEvent(type, {detail: {name}}))
  emit('xrimagefound', '22_Element_Air')
  assert.equal(state.markers.MARKER_02, 'LOCKED')
  emit('xrimagefound')
  emit('xrimagefound')
  emit('xrimageupdated')
  emit('xrimagelost')
  assert.equal(state.step, 'WAITING_CHARACTER_ANSWER')
  emit('xrimageupdated')
  assert.equal(events.filter(e => e.event === 'marker_01_found').length, 1)
  assert.equal(losses, 1)
  const before = updates
  manager.dispose()
  emit('xrimagefound')
  assert.equal(updates, before)
  assert.equal(manager.tracked.size, 0)
})
test('throwing analytics cannot block completion; disposed controller ignores events', () => {
  const {controller: c, state} = fixture(() => { throw new Error('offline') })
  reachFile(c)
  c.action('CONFIRM_FILE')
  for (let i = 0; i < 8; i += 1) c.action('NEXT')
  assert.equal(state.completed, true)
  const another = fixture().controller
  another.dispose()
  assert.equal(another.detect('MARKER_01'), false)
  assert.equal(another.state.step, 'SEARCH_CHARACTER')
})
test('all target metadata point to real PNG files; no Git LFS pointers', () => {
  for (const name of Object.keys(episode.targets)) {
    const metadata = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../image-targets', name + '.json')))
    assert.equal(metadata.name, name)
    assert.equal(metadata.type, 'PLANAR')
    const bytes = fs.readFileSync(path.resolve(__dirname, '..', metadata.imagePath))
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG')
  }
})