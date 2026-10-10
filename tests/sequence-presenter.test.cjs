const test = require('node:test')
const assert = require('node:assert/strict')
const {load, fakeTime, fixture, step} = require('./helpers/platform-fixture.cjs')
const {createSequencePresenter} = load('platform/ui/sequence-presenter.js')
const {createGameClock} = load('platform/core/game-clock.js')
const {createMechanicRegistry} = load('platform/core/mechanic-registry.js')
const {sequenceMechanic} = load('platform/modules/mechanics/sequence.js')
function setup() {
 const config=step('s',null,{mechanic_id:'AR-07',mechanic:'SEQUENCE',content:{target_ids:['a','b']},parameters:{available_elements:['a','b'],target_sequence:['a','a','b'],sequence_length:3,display_speed:100,gap_ms:50},success_condition:{metric:'player_sequence',op:'eq',value:['a','a','b']}})
 const f=fixture([config],{registry:createMechanicRegistry([sequenceMechanic]),capabilities:['objectTouch','sequencePresentation'],objectIds:['a','b']})
 const time=fakeTime(), frames=[], lit=new Set();let ready=false
 const presenter=createSequencePresenter({runner:f.runner,clock:createGameClock(time),isReady:()=>ready,highlight:id=>{lit.add(id);frames.push(id)},clearHighlight:id=>lit.delete(id)})
 return {...f,time,frames,lit,presenter,ready:()=>{ready=true}}
}
test('Presentation waits for geometry, separates repeated pulses and confirms only after full playback', () => {
 const f=setup();f.runner.start();f.time.advance(1100);assert.equal(f.frames.length,0)
 f.ready();f.time.advance(50);assert.deepEqual(f.frames,['a'])
 f.time.advance(100);assert.equal(f.lit.size,0)
 f.time.advance(50);assert.deepEqual(f.frames,['a','a'])
 f.time.advance(299);assert.equal(f.runner.getSnapshot().mechanic.state.phase,'SHOWING')
 f.time.advance(1);assert.equal(f.runner.getSnapshot().mechanic.state.phase,'INPUT')
 f.presenter.dispose();f.runner.dispose()
})
test('Pause cancels lit frame and timers; resume restarts without penalty; dispose cancels pending work', () => {
 const f=setup();f.ready();f.runner.start();f.time.advance(1000)
 const token=f.runner.getSnapshot().mechanic.state.presentation_token
 f.runner.pause();assert.equal(f.lit.size,0);f.time.advance(10000)
 assert.equal(f.frames.length,1);f.runner.resume()
 assert.notEqual(f.runner.getSnapshot().mechanic.state.presentation_token,token)
 assert.equal(f.runner.getSnapshot().mechanic.state.attempts,0)
 f.time.advance(1450);assert.equal(f.runner.getSnapshot().mechanic.state.phase,'INPUT')
 f.runner.input('presentation.sequence_replay',{});f.presenter.dispose();f.time.advance(10000)
 assert.equal(f.runner.getSnapshot().mechanic.state.phase,'SHOWING');assert.equal(f.time.pending(),0);f.runner.dispose()
})
