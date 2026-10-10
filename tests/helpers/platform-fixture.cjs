const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const babel = require('@babel/core')
const root = path.resolve(__dirname, '../..')
const cache = new Map()
function load(relative) {
  const filename = path.resolve(root, relative)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = {exports: {}}
  cache.set(filename, module)
  const {code} = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, presets: [['@babel/preset-env', {targets: {node: 'current'}, modules: 'commonjs'}]],
  })
  vm.runInNewContext(code, {module, exports: module.exports, Error, console, performance, setTimeout, clearTimeout,
    require: name => load(path.relative(root, path.resolve(path.dirname(filename), name + '.js'))),
  }, {filename})
  return module.exports
}
function fakeTime() {
  let now = 0
  let id = 0
  const tasks = new Map()
  return {
    now: () => now,
    setTimer(fn, delay) {tasks.set(++id, {fn, at: now + delay}); return id},
    clearTimer(key) {tasks.delete(key)},
    pending: () => tasks.size,
    advance(ms) {
      const end = now + ms
      let limit = 1000
      while (true) {
        const next = [...tasks].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
        if (!next) break
        if (--limit < 0) throw new Error('Fake timer loop')
        now = next[1].at; tasks.delete(next[0]); next[1].fn()
      }
      now = end
    },
  }
}
function step(id = 'scan-a', marker = 'marker-a', overrides = {}) {
  return {step_id: id, mechanic_id: 'AR-01', mechanic: 'SCAN', difficulty: 1,
    content: {marker_id: marker, object_ids: ['terminal']},
    parameters: {time_limit: null, accept_existing: true},
    success_condition: {metric: 'marker_detected', op: 'eq', value: true},
    fail_condition: null, hints: [], advance: 'manual', next: {success: null, fail: null}, ...overrides}
}
const environment = {capabilities: ['markerInput'], markerIds: ['marker-a', 'marker-b'], objectIds: ['terminal'], hintIds: ['look']}
function fixture(steps = [step()], options = {}) {
  const time = fakeTime()
  const {createGameClock} = load('platform/core/game-clock.js')
  const {createMechanicRegistry} = load('platform/core/mechanic-registry.js')
  const {scanMechanic} = load('platform/modules/mechanics/scan.js')
  const {createScenarioRunner} = load('platform/core/scenario-runner.js')
  const clock = createGameClock(time)
  const runner = createScenarioRunner({gameId: 'test-game', scenario: {id: 'test', first_step: steps[0].step_id, steps},
    registry: createMechanicRegistry([scanMechanic]), clock, ...environment, ...options})
  const events = []
  runner.on('*', event => events.push(event), {critical: false})
  return {runner, time, clock, events}
}
module.exports = {load, fakeTime, step, environment, fixture, plain: value => JSON.parse(JSON.stringify(value))}
