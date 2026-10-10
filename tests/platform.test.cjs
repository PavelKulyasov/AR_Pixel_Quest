const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '..')
function load(relative, name) {
  const context = {}
  vm.createContext(context)
  vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8').replace(/export /g, '') + '\nthis.result = ' + name, context)
  return context.result
}
const createEpisodeRuntime = load('platform/core/episode-runtime.js', 'createEpisodeRuntime')
const createGameState = load('platform/core/game-state.js', 'createGameState')
function fixture(id) {
  const first = id + '-entrance'
  const second = id + '-exit'
  const store = createGameState(id, [first, second])
  const visible = new Set()
  const poses = new Map()
  const tracked = new Map()
  const calls = {renders: 0, disposals: 0}
  let handlers, action
  const runtime = createEpisodeRuntime({
    episode: {id, targets: {}, objects: {[first]: {}, [second]: {}}},
    createController: ({render}) => ({
      state: store.state,
      start() {store.move('SEARCH'); render({task: id})},
      detect(marker) {if (store.find(marker)) render({task: marker})},
      action() {
        if (store.state.markers[first] === 'FOUND') store.completeMarker(first, second)
        else {store.completeMarker(second); store.move('DONE', {completed: true})}
        render({})
      },
      dispose() {calls.disposals++},
    }),
    createUI: onAction => { action = onAction; return {render() {calls.renders++}, tracking() {}, dispose() {calls.disposals++}} },
    createObjects: () => ({show(marker, pose) {visible.add(marker); poses.set(marker, pose)}, hide(marker) {visible.delete(marker)}, dispose() {calls.disposals++}}),
    createMarkers: (_targets, callbacks) => {handlers = callbacks; return {tracked, dispose() {tracked.clear(); calls.disposals++}}},
  })
  return {runtime, first, second, store, visible, poses, calls, action: () => action('ADVANCE'),
    find(marker, pose) {tracked.set(marker, pose); handlers.found(marker); handlers.updated(marker)},
    lose(marker) {tracked.delete(marker); handlers.lost(marker)},
  }
}
test('shared runtime supports unrelated games, retained objects, corrections and cleanup', () => {
  const a = fixture('museum')
  const b = fixture('garden')
  a.find(a.second, {x: 2})
  assert.equal(a.visible.size, 0)
  a.find(a.first, {x: 1})
  a.lose(a.first)
  assert.equal(a.visible.has(a.first), true)
  a.action()
  assert.equal(a.visible.has(a.second), true, 'already visible locked target unlocks')
  a.find(a.first, {x: 9})
  assert.equal(a.poses.get(a.first).x, 9, 'completed marker pose is corrected')
  assert.equal(b.store.state.markers[b.first], 'AVAILABLE')
  assert.equal(b.visible.size, 0)
  a.action()
  assert.equal(a.store.state.completed, true)
  assert.equal(a.visible.size, 0)
  a.runtime.dispose()
  a.runtime.dispose()
  assert.equal(a.calls.disposals, 4, 'each adapter disposed exactly once')
  b.find(b.first, {x: 3})
  assert.equal(b.visible.has(b.first), true)
  b.runtime.dispose()
})
test('platform imports stay within platform and do not embed Pixel Quest content', () => {
  function visit(dir) {
    return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => entry.isDirectory() ? visit(path.join(dir, entry.name)) : [path.join(dir, entry.name)])
  }
  const platform = path.join(root, 'platform')
  for (const file of visit(platform).filter(file => file.endsWith('.js'))) {
    const source = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(source, /Pixel Quest|MARKER_01|anomalyModel|UNKNOWN USER/)
    for (const match of source.matchAll(/from ['"]([^'"]+)['"]/g)) {
      const target = path.resolve(path.dirname(file), match[1])
      assert.ok(target.startsWith(platform + path.sep), file + ' imports ' + match[1])
      assert.ok(fs.existsSync(target + '.js'), 'Missing import: ' + target)
    }
  }
})
test('build selects the game and rejects missing games and path traversal', () => {
  const config = require('../config/webpack.config.js')
  assert.equal(config().entry, path.join(root, 'games/pixel-quest/app.js'))
  assert.equal(config({game: 'pixel-quest'}).context, path.join(root, 'games/pixel-quest'))
  assert.throws(() => config({game: '../pixel-quest'}), /Invalid game id/)
  assert.throws(() => config({game: 'not-a-real-game'}), /Missing game file/)
})
