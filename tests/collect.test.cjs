const test = require('node:test')
const assert = require('node:assert/strict')
const {load, fixture, step} = require('./helpers/platform-fixture.cjs')
const {collectMechanic} = load('platform/modules/mechanics/collect.js')
const {createMechanicRegistry} = load('platform/core/mechanic-registry.js')
const registry = createMechanicRegistry([collectMechanic])
function config(ids, order = 'any') { return step('collect', null, {mechanic_id:'AR-05', mechanic:'COLLECT', content:{target_ids:ids}, parameters:{target_count:ids.length, collection_order:order}, success_condition:{metric:'collected_count', op:'eq', value:ids.length}}) }
function setup(ids, order) { return fixture([config(ids, order)], {registry, capabilities:['objectTouch'], objectIds:ids}) }
const tap = (runner, id, interaction = id) => runner.input('input.target_touched', {target_id:id, interaction_id:interaction})
test('COLLECT reuses logic for cells and creatures; distinct targets and interactions only', () => {
  for (const ids of [['a','b','c','d'], ['fox','owl','cat','dog']]) {
    const {runner, events} = setup(ids); runner.start()
    assert.equal(runner.getSnapshot().mechanic.progress.total, 4)
    tap(runner, 'foreign'); tap(runner, ids[0], '')
    tap(runner, ids[0], 'one'); tap(runner, ids[0], 'other'); tap(runner, ids[1], 'one')
    assert.equal(runner.getSnapshot().mechanic.state.collected_count, 1)
    for (const id of ids.slice(1).reverse()) tap(runner, id)
    assert.equal(runner.getSnapshot().status, 'AWAITING_NEXT')
    tap(runner, ids[3], 'again')
    assert.equal(events.filter(e => e.type === 'mechanic.completed').length, 1)
    assert.equal(events.filter(e => e.type === 'mechanic.feedback' && e.payload.type === 'collected').length, 4)
    runner.dispose()
  }
})
test('COLLECT wrong order gives feedback without progress; restart clears collection and stale input', () => {
  const {runner, events} = setup(['a','b'], ['b','a']); runner.start()
  tap(runner, 'a', 'wrong')
  assert.equal(runner.getSnapshot().mechanic.state.collected_count, 0)
  assert.equal(events.at(-1).payload.type, 'wrong_order')
  tap(runner, 'b'); tap(runner, 'a', 'wrong')
  assert.equal(runner.getSnapshot().mechanic.state.collected_count, 1)
  const old = runner.createInput('input.target_touched', {target_id:'a', interaction_id:'old'})
  runner.restart(); runner.dispatch(old)
  assert.equal(runner.getSnapshot().mechanic.state.collected_count, 0)
  tap(runner, 'b'); tap(runner, 'a')
  assert.equal(runner.getSnapshot().status, 'AWAITING_NEXT'); runner.dispose()
})
test('COLLECT validates counts, distinct targets, ordering and success', () => {
  const base = config(['a','b'])
  const env = {capabilities:['objectTouch'], objectIds:['a','b'], hintIds:[]}
  for (const target_count of [0,3,1.5]) assert.throws(() => registry.validateStep({...base, parameters:{target_count}}, env))
  for (const target_ids of [[], ['a','a'], ['missing']]) assert.throws(() => registry.validateStep({...base, content:{target_ids}}, env))
  for (const collection_order of [['a','a'], ['a'], ['a','missing'], 'invalid']) assert.throws(() => registry.validateStep({...base, parameters:{target_count:2, collection_order}}, env))
  assert.throws(() => registry.validateStep({...base, success_condition:{metric:'collected_count',op:'eq',value:1}},env))
})
test('COLLECT pause and timeout preserve partial count, and late touches cannot succeed', () => {
  const base = config(['a','b']); base.parameters.time_limit = 100
  const {runner,time} = fixture([base], {registry, capabilities:['objectTouch'], objectIds:['a','b']})
  runner.start(); tap(runner,'a'); runner.pause(); tap(runner,'b'); time.advance(200)
  assert.equal(runner.getSnapshot().mechanic.state.collected_count,1)
  runner.resume(); time.advance(100); tap(runner,'b')
  assert.equal(runner.getSnapshot().outcome,'FAIL'); runner.dispose()
})
