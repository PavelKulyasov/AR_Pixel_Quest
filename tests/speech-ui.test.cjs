const test = require('node:test')
const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
class Element {
  constructor() { this.children = []; this.events = {}; this.hidden = false; this.textContent = '' }
  setAttribute() {}
  appendChild(child) { this.children.push(child) }
  replaceChildren() { this.children = [] }
  addEventListener(type, handler) { this.events[type] = handler }
  removeEventListener(type) { delete this.events[type] }
  querySelector(selector) { return this.nodes[selector] ||= new Element() }
  remove() { this.removed = true }
}
function fixture(supported = true) {
  const document = new Element()
  document.body = new Element()
  document.createElement = () => { const e = new Element(); e.nodes = {}; return e }
  const queue = []
  const synth = {getVoices: () => [{lang: 'ru-RU'}], cancel: () => {queue.length = 0}, resume() {}, speak: u => queue.push(u)}
  const context = {document, window: supported ? {speechSynthesis: synth, SpeechSynthesisUtterance: function(text) {this.text = text}} : {}, setTimeout: () => 1, clearTimeout() {}}
  vm.createContext(context)
  vm.runInContext(fs.readFileSync(require.resolve('../src/game/ui.js'), 'utf8').replace('export function', 'function') + '\nthis.ui = createUI(() => {})', context)
  return {ui: context.ui, root: document.body.children[0], document, queue}
}
test('speech requires activation; changes cancel old speech; errors allow text and replay', () => {
  const f = fixture()
  const node = selector => f.root.querySelector(selector)
  f.ui.render({system: 'System.', character: 'Hello!'})
  assert.equal(f.queue.length, 0)
  assert.equal(node('.quest-system').hidden, true)
  node('.quest-enable').events.click()
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
