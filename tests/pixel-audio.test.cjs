const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
function fixture(state = 'running') {
  const timers = new Map()
  const oscillators = []
  let id = 0
  const param = {setValueAtTime() {}, linearRampToValueAtTime() {}}
  const context = {state, currentTime: 0, destination: {}, resume() {return Promise.resolve()}, close() {this.state = 'closed'},
    createOscillator() { const o = {frequency: param, connect() {}, disconnect() {}, start() {}, stop() {this.stopped = true}}; oscillators.push(o); return o },
    createGain() {return {gain: param, connect() {}, disconnect() {}}},
  }
  const scope = {window: {AudioContext: function() {return context}}, setTimeout(fn) {timers.set(++id, fn); return id}, clearTimeout(key) {timers.delete(key)}}
  vm.createContext(scope)
  vm.runInContext(fs.readFileSync(require.resolve('../games/pixel-quest/config/audio-cues.js'), 'utf8').replace(/export /g, ''), scope)
  vm.runInContext(fs.readFileSync(require.resolve('../platform/modules/audio/pixel-audio.js'), 'utf8').replace(/export /g, '') + '\nthis.audio = createPixelAudio(pixelCues)', scope)
  return {audio: scope.audio, context, oscillators, timers}
}
test('motif ends before continuation; stop releases nodes and cancels continuation', async () => {
  const f = fixture()
  await f.audio.unlock()
  let calls = 0
  f.audio.play('character', () => calls++)
  await new Promise(setImmediate)
  assert.equal(f.oscillators.length, 4)
  assert.equal(calls, 0)
  const finish = [...f.timers.values()][0]
  finish()
  assert.equal(calls, 1)
  f.audio.play('danger', () => calls++)
  await new Promise(setImmediate)
  const stale = [...f.timers.values()][0]
  f.audio.stop()
  stale()
  assert.equal(calls, 1)
  assert.ok(f.oscillators.every(o => o.stopped))
  assert.equal(f.timers.size, 0)
  f.audio.dispose()
  assert.equal(f.context.state, 'closed')
})
test('suspended context falls back to speech without generating sound', async () => {
  const f = fixture('suspended')
  await f.audio.unlock()
  let calls = 0
  f.audio.play('denied', () => calls++)
  await new Promise(setImmediate)
  await new Promise(setImmediate)
  await new Promise(setImmediate)
  assert.equal(calls, 1)
  assert.equal(f.oscillators.length, 0)
  f.audio.dispose()
})
