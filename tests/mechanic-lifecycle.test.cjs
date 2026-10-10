const test = require('node:test')
const assert = require('node:assert/strict')
const {load, fakeTime, step} = require('./helpers/platform-fixture.cjs')
const {createGameClock} = load('platform/core/game-clock.js')
const {createMechanicLifecycle} = load('platform/core/mechanic-lifecycle.js')
function make() {
  const time = fakeTime(); const clock = createGameClock(time); const events = []
  const life = createMechanicLifecycle(step('a', 'marker-a', {parameters: {time_limit: 100}, hints: [{after_ms: 30, content_id: 'look'}]}),
    {clock, emit: (type, payload) => events.push({type, payload}), onError: error => {throw error}}, {marker_detected: false})
  return {life, time, events, clock}
}
test('success wins once and cancels timeout/hints; reset restores READY', () => {
  const {life, time, events} = make()
  assert.equal(life.getSnapshot().status, 'READY')
  life.start(); life.start(); time.advance(30)
  assert.equal(events.filter(e => e.type === 'mechanic.hint').length, 1)
  life.update({marker_detected: true}, {current: 1, total: 1})
  life.succeed(); life.succeed(); time.advance(500)
  assert.equal(events.filter(e => e.type === 'mechanic.completed').length, 1)
  assert.equal(life.getSnapshot().outcome, 'SUCCESS')
  life.reset(); assert.equal(life.getSnapshot().state.marker_detected, false)
  life.dispose(); assert.equal(time.pending(), 0)
})
test('timeout fails once; disposal produces no completion', () => {
  const f = make(); f.life.start(); f.time.advance(100)
  assert.equal(f.life.getSnapshot().reason, 'timeout')
  f.life.succeed(); assert.equal(f.events.filter(e => e.type === 'mechanic.completed').length, 1)
  const other = make(); other.life.start(); other.life.dispose(); other.time.advance(500)
  assert.equal(other.events.filter(e => e.type === 'mechanic.completed').length, 0)
})
