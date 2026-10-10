const test = require('node:test')
const assert = require('node:assert/strict')
const {fixture, step} = require('./helpers/platform-fixture.cjs')
test('SCAN filters markers and succeeds once; data can describe different content', () => {
  for (const marker of ['marker-a', 'marker-b']) {
    const f = fixture([step('scan', marker)])
    f.runner.start()
    f.runner.input('ar.marker_detected', {marker_id: 'wrong'})
    assert.equal(f.runner.getSnapshot().status, 'ACTIVE')
    f.runner.input('ar.marker_detected', {marker_id: marker})
    f.runner.input('ar.marker_detected', {marker_id: marker})
    assert.equal(f.runner.getSnapshot().mechanic.state.marker_detected, true)
    assert.equal(f.events.filter(e => e.type === 'mechanic.completed').length, 1)
    f.runner.dispose()
  }
})
test('SCAN may accept a visible marker snapshot or require a new observation', () => {
  const f = fixture([step('scan', 'marker-a', {parameters: {accept_existing: false, time_limit: null}})])
  f.runner.start(); f.runner.input('ar.marker_detected', {marker_id: 'marker-a'}, 'snapshot')
  assert.equal(f.runner.getSnapshot().status, 'ACTIVE')
  f.runner.input('ar.marker_detected', {marker_id: 'marker-a'}, 'ar')
  assert.equal(f.runner.getSnapshot().status, 'AWAITING_NEXT')
  f.runner.dispose()
})
