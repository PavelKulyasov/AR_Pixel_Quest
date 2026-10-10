const test=require('node:test')
const assert=require('node:assert/strict')
const {fixture,step}=require('./helpers/platform-fixture.cjs')
test('presentation-only scenes use no AR ID and transition after paused timeline',()=>{
  const {runner,time}=fixture([{step_id:'intro',kind:'presentation',enter:[{type:'state',value:'INTRO'},{type:'wait',duration_ms:500}],exit:[],advance:'auto',next:{success:'scan',fail:null}},step('scan')])
  runner.start();time.advance(200);runner.pause();time.advance(5000)
  assert.equal(runner.getSnapshot().step_id,'intro')
  runner.resume();time.advance(300);assert.equal(runner.getSnapshot().step_id,'scan')
  runner.dispose();assert.equal(time.pending(),0)
})
test('invalid scene commands fail before execution',()=>{
  for(const command of [{type:'wait',duration_ms:-1},{type:'effect',target:'x',effect:'missing'},{type:'dialogue'},{type:'sound',category:'OTHER',cue:'x'}]) {
    assert.throws(()=>fixture([step('scan','marker-a',{enter:[command]})]))
  }
})
test('critical presentation failures cancel scene timers',()=>{
 const {runner,time}=fixture([step('scan','marker-a',{enter:[{type:'wait',duration_ms:100}]})])
 runner.on('scene.command',()=>{throw Error('presentation unavailable')})
 runner.start();assert.equal(runner.getSnapshot().status,'ERROR');assert.equal(time.pending(),0)
 runner.dispose()
})
