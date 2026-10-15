const test = require('node:test')
const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
class Element {
  constructor() { this.nodes = {}; this.children = []; this.events = {}; this.hidden = false; this.textContent = '' }
  setAttribute(key, value) { (this.attributes ||= {})[key] = value }
  getAttribute(key) { return this.attributes?.[key] }
  get textContent() { return this.children.length ? this.children.map(child => child.textContent).join('') : this.value || '' }
  set textContent(value) { this.value = value; this.children = [] }
  appendChild(child) { child.remove(); child.removed = false; child.parent = this; this.children.push(child) }
  replaceChildren() { this.children = [] }
  addEventListener(type, handler) { this.events[type] = handler }
  removeEventListener(type) { delete this.events[type] }
  querySelector(selector) { return this.nodes[selector] ||= new Element() }
  remove() { this.removed = true; if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null }
}
function fixture(supported = true, options = {}, setupDocument = () => {}) {
  const document = new Element()
  document.body = new Element()
  document.createElement = () => { const e = new Element(); e.nodes = {}; return e }
  setupDocument(document)
  const queue = []
  const synth = {getVoices: () => [{lang: 'ru-RU'}], cancel: () => {queue.length = 0}, resume() {}, speak: u => queue.push(u)}
  const effects = {unlock() {}, stop() {}, dispose() {}, play(name, done) { done() }}
  const context = {createButtonCarousel: () => ({refresh() {}, dispose() {}}), options, createPixelAudio: () => effects, document, window: supported ? {speechSynthesis: synth, SpeechSynthesisUtterance: function(text) {this.text = text}} : {}, setTimeout: options.timers?.setTimer || (() => 1), clearTimeout: options.timers?.clearTimer || (() => {})}
  if (options.audioClass) context.window.Audio = options.audioClass
  vm.createContext(context)
  vm.runInContext(fs.readFileSync(require.resolve('../platform/ui/quest-ui.js'), 'utf8').replace(/^import[^\n]*\n/m, '').replace('export function', 'function') + '\nthis.ui = createUI(() => {}, {createAudio: createPixelAudio, ...options})', context)
  return {ui: context.ui, root: document.body.children[0], document, queue, effects}
}
test('speech requires activation; changes cancel old speech; errors allow text and replay', () => {
  const f = fixture()
  const node = selector => f.root.querySelector(selector)
  f.ui.render({system: 'System.', character: 'Hello!'})
  assert.equal(f.queue.length, 0)
  assert.equal(node('.quest-system').hidden, true)
  node('.quest-enable').events.click()
  assert.equal(f.queue.length, 1)
  f.queue[0].onend()
  assert.equal(f.queue.length, 2)
  assert.equal(f.queue[0].lang, 'ru-RU')
  const old = f.queue[0]
  f.ui.render({character: 'New line.'})
  assert.equal(f.queue.length, 1)
  assert.equal(f.queue[0].text, 'New line.')
  old.onerror()
  assert.equal(node('.quest-character').hidden, true)
  f.queue[0].onerror()
  assert.equal(node('.quest-character').hidden, false)
  node('.quest-repeat').events.click()
  assert.equal(f.queue.length, 1)
  f.document.hidden = true
  f.document.events.visibilitychange()
  assert.equal(f.queue.length, 0)
  f.ui.dispose()
  assert.equal(f.root.removed, true)
  assert.equal(f.document.events.visibilitychange, undefined)
})
test('unsupported browsers show dialogue text', () => {
  const f = fixture(false)
  f.ui.render({system: 'Text'})
  assert.equal(f.root.querySelector('.quest-system').hidden, false)
  assert.equal(f.root.querySelector('.quest-enable').hidden, true)
  f.ui.dispose()
})

 test('cues precede each speaker and cancellation prevents delayed speech', () => {
  const f = fixture()
  const cues = []
  f.effects.play = (name, done) => cues.push({name, done})
  f.ui.render({system: 'Allowed.', systemCue: 'granted', character: 'Hello. Again.'})
  f.root.querySelector('.quest-enable').events.click()
  assert.equal(f.queue.length, 0)
  assert.equal(cues[0].name, 'granted')
  cues[0].done()
  f.queue[0].onend()
  assert.equal(cues[1].name, 'character')
  cues[1].done()
  f.queue[1].onend()
  assert.equal(cues.length, 2)
  assert.equal(f.queue[2].text, 'Again.')
  f.ui.render({character: 'Cancelled.'})
  const delayed = cues[2].done
  f.root.querySelector('.quest-enable').events.click()
  delayed()
  assert.equal(f.queue.length, 0)
  f.ui.dispose()
})

test('game presentation adapters format labels and speech outside the shared UI', () => {
  const f = fixture(true, {formatActionLabel: label => 'Action: ' + label, formatSpeech: text => 'Voice: ' + text})
  f.ui.render({system: 'Ready.', actions: [{id: 'GO', label: 'Enter'}]})
  assert.equal(f.root.querySelector('.quest-actions').children[0].textContent, 'Action: Enter')
  f.root.querySelector('.quest-enable').events.click()
  assert.equal(f.queue[0].text, 'Voice: Ready.')
  f.ui.dispose()
})

test('fullscreen requests the document from a tap, tracks browser exit and removes listeners', async () => {
  let calls = 0
  const f = fixture(true, {}, document => {
    document.documentElement = {requestFullscreen: async options => {
      assert.equal(options.navigationUI, 'hide'); calls++
      document.fullscreenElement = document.documentElement
      document.events.fullscreenchange()
    }}
    document.exitFullscreen = async () => {document.fullscreenElement = null; document.events.fullscreenchange()}
  })
  const button = f.root.querySelector('.quest-fullscreen')
  assert.equal(calls, 0)
  await button.events.click()
  assert.equal(calls, 1)
  assert.equal(button.getAttribute('aria-label'), 'Выйти из полного экрана')
  await button.events.click()
  assert.equal(button.getAttribute('aria-label'), 'На весь экран')
  await button.events.click()
  f.document.fullscreenElement = null; f.document.events.fullscreenchange()
  assert.equal(button.getAttribute('aria-label'), 'На весь экран')
  f.ui.dispose()
  assert.equal(f.document.events.fullscreenchange, undefined)
  assert.equal(f.document.events.webkitfullscreenchange, undefined)
})
test('unsupported fullscreen and rejected requests leave the game UI usable', async () => {
  const unsupported = fixture()
  assert.equal(unsupported.root.querySelector('.quest-fullscreen').hidden, true)
  unsupported.ui.dispose()
  const f = fixture(true, {}, document => {
    document.documentElement = {requestFullscreen: () => Promise.reject(new Error('denied'))}
    document.exitFullscreen = async () => {}
  })
  const button = f.root.querySelector('.quest-fullscreen')
  await button.events.click()
  assert.equal(button.disabled, false)
  assert.match(f.root.querySelector('.quest-fullscreen-status').textContent, /не разрешил/)
  f.ui.render({task: 'Continue'})
  assert.equal(f.root.querySelector('.quest-task').textContent, 'Continue')
  f.ui.dispose()
})

test('overlay lines expire individually after five seconds and dispose cancels pending lines', () => {
  const {fakeTime} = require('./helpers/platform-fixture.cjs')
  const timers = fakeTime()
  const f = fixture(false, {timers})
  f.ui.render({system:'Первая\nВторая', showText:true})
  const box=f.root.querySelector('.quest-system'), first=box.children[0], second=box.children[1]
  assert.equal(second.hidden,true)
  timers.advance(200)
  assert.equal(second.hidden,false)
  f.ui.render({character:'Новая реплика',showText:true})
  assert.equal(first.removed,false,'A new view removed previous text early')
  timers.advance(4799)
  assert.equal(first.removed,false)
  timers.advance(1)
  assert.equal(first.removed,true)
  assert.equal(second.removed,false)
  timers.advance(200)
  assert.equal(second.removed,true)
  f.ui.render({system:'Третья\nЧетвёртая',showText:true})
  f.ui.dispose()
  assert.equal(timers.pending(),0)
})

test('local recordings work without browser synthesis; queue, repeat, cancellation and late errors are isolated', async () => {
  const clips = []
  class Audio {
    constructor(src) {this.src=src; clips.push(this)}
    play() {this.started=true; this.onplaying(); return Promise.resolve()}
    pause() {this.paused=true}
    removeAttribute() {this.src=''}
    load() {}
  }
  const f=fixture(false, {audioClass:Audio, resolveSpeechAudio:(speaker,text)=>speaker+'/'+text+'.wav'})
  const enable=f.root.querySelector('.quest-enable')
  assert.equal(enable.hidden,false)
  f.ui.render({system:'Первая. Вторая.',character:'Привет!'})
  assert.equal(clips.length,0,'No playback or loading before activation')
  enable.events.click()
  assert.equal(clips.length,3)
  assert.equal(clips[0].src,'Система/Первая..wav')
  assert.equal(clips[0].started,true)
  assert.equal(clips[1].started,undefined)
  clips[0].onended()
  assert.equal(clips[1].started,true)
  clips[1].onended()
  assert.equal(clips[2].started,true)
  const old=clips[2]
  f.ui.render({character:'Новая.'})
  assert.equal(old.paused,true)
  old.onerror()
  assert.equal(f.root.querySelector('.quest-character').hidden,true,'Stale error changed current playback')
  clips.at(-1).onerror()
  assert.equal(f.root.querySelector('.quest-character').hidden,false)
  f.root.querySelector('.quest-repeat').events.click()
  assert.equal(clips.at(-1).started,true)
  f.document.hidden=true
  f.document.events.visibilitychange()
  assert.equal(clips.at(-1).paused,true)
  f.ui.dispose()
})

test('missing local recordings and rejected playback show text without falling back to browser voices', async () => {
  class Audio {
    play() {return Promise.reject(new Error('Blocked'))}
    pause() {}
    removeAttribute() {}
    load() {}
  }
  const missing=fixture(true, {audioClass:Audio, resolveSpeechAudio:()=>null})
  missing.ui.render({system:'Нет записи.'})
  missing.root.querySelector('.quest-enable').events.click()
  assert.equal(missing.queue.length,0)
  assert.equal(missing.root.querySelector('.quest-system').hidden,false)
  missing.ui.dispose()
  const rejected=fixture(false, {audioClass:Audio, resolveSpeechAudio:()=>'/clip.wav'})
  rejected.ui.render({character:'Привет.'})
  rejected.root.querySelector('.quest-enable').events.click()
  await Promise.resolve()
  assert.equal(rejected.root.querySelector('.quest-character').hidden,false)
  rejected.ui.dispose()
})
