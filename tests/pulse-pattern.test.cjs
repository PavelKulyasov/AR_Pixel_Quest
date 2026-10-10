const test=require('node:test')
const assert=require('node:assert/strict')
const {load}=require('./helpers/platform-fixture.cjs')
const {pulseAmount,createPulsePatterns,validatePulsePattern}=load('platform/ar/pulse-pattern.js')
const {chooseConfig,corePattern}=load('games/pixel-quest/episodes/null-escape/choose-config.js')
test('only configured correct core has two pulses; pauses and cycle repeat distinctly',()=>{
 const pattern=corePattern(chooseConfig.correctCore)
 assert.equal(pattern.length,4)
 assert.equal(pulseAmount(pattern,150),1)
 assert.equal(pulseAmount(pattern,400),0)
 assert.equal(pulseAmount(pattern,670),1)
 assert.equal(pulseAmount(pattern,1200),0)
 assert.equal(pulseAmount(pattern,2320+150),1)
 assert.equal(chooseConfig.cores.map(c=>corePattern(c.id).length).join(','),'2,6,4,2')
 const moved={...chooseConfig,correctCore:'core_01'}
 assert.equal(corePattern('core_01',moved),moved.correctPattern)
 assert.notEqual(corePattern('core_03',moved),moved.correctPattern)
})
test('pulse animation preserves baseline and anchor, freezes with active time, restores on retry/disposal',()=>{
 class Vector {constructor(x=1){this.x=x}clone(){return new Vector(this.x)}copy(v){this.x=v.x;return this}multiplyScalar(n){this.x*=n;return this}}
 const visual={scale:new Vector(2)},anchor={position:7}
 let available=false
 const player=createPulsePatterns({getVisual3D:()=>available?visual:null})
 player.start('target',[300,220,300,1500],100)
 player.tick(150);available=true;player.tick(250)
 assert.equal(visual.scale.x,2.6);assert.equal(anchor.position,7)
 player.tick(250);assert.equal(visual.scale.x,2.6)
 player.tick(500);assert.equal(visual.scale.x,2)
 player.start('target',[300,2020],500);player.tick(650);assert.equal(visual.scale.x,2.6)
 player.reset();assert.equal(visual.scale.x,2)
 player.tick(10000);assert.equal(visual.scale.x,2)
})
test('invalid pulse configurations fail explicitly',()=>{
 for(const pattern of [[],[1],[0,1],[-1,1],[Infinity,1],[1,NaN]])assert.throws(()=>validatePulsePattern(pattern))
})
