const test = require('node:test')
const assert = require('node:assert/strict')
const {load} = require('./helpers/platform-fixture.cjs')
const {createEventBus} = load('platform/core/event-bus.js')
test('nested emissions use FIFO and removed listeners do not receive queued events', () => {
  const bus = createEventBus()
  const seen = []
  let off
  bus.on('a', () => {seen.push('a1'); bus.emit({type: 'b'}); off()})
  bus.on('a', () => seen.push('a2'))
  off = bus.on('b', () => seen.push('removed'))
  bus.on('b', () => seen.push('b'))
  bus.emit({type: 'a'})
  assert.deepEqual(seen, ['a1', 'a2', 'b'])
  bus.dispose()
  assert.equal(bus.emit({type: 'b'}), false)
})
test('optional observer failure is isolated; critical failure clears queued gameplay', () => {
  const errors = []
  const bus = createEventBus({onError: e => errors.push(e.message), onObserverError: e => errors.push(e.message)})
  let called = 0
  bus.on('x', () => {throw new Error('observer')}, {critical: false})
  bus.on('x', () => called++)
  bus.emit({type: 'x'})
  assert.equal(called, 1)
  bus.on('bad', () => {bus.emit({type: 'x'}); throw new Error('critical')})
  bus.emit({type: 'bad'})
  assert.equal(called, 1)
  assert.deepEqual(errors, ['observer', 'critical'])
})
test('listeners see immutable snapshots and invalid numeric payloads are rejected', () => {
  const bus = createEventBus()
  const input = {type: 'value', payload: {count: 1}}
  bus.on('value', event => {
    assert.ok(Object.isFrozen(event.payload))
    input.payload.count = 2
    assert.equal(event.payload.count, 1)
  })
  bus.emit(input)
  assert.throws(() => bus.emit({type: 'value', payload: {count: NaN}}), /JSON data/)
})
