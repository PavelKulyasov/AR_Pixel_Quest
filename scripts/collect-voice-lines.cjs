const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const {load} = require('../tests/helpers/platform-fixture.cjs')
const {formatSpeech, speechParts, speechKey} = load('games/pixel-quest/audio/speech-text.js')
function collectSpeech() {
  const clips = new Map()
  function add(speaker, text) {
    for (const part of speechParts(text || '')) {
      const spoken = formatSpeech(part)
      const key = speechKey(speaker, spoken)
      if (!clips.has(key)) clips.set(key, {key, speaker, text:spoken, file:crypto.createHash('sha256').update(key).digest('hex').slice(0,24) + '.wav'})
    }
  }
  function walk(value) {
    if (!value || typeof value !== 'object') return
    for (const [key, item] of Object.entries(value)) {
      if (['system','character'].includes(key) && typeof item === 'string') add(key === 'system' ? 'Система' : 'Персонаж', item)
      else walk(item)
    }
  }
  const {getView, episode} = load('games/pixel-quest/episodes/episode-01/config.js')
  const states = ['SEARCH_CHARACTER','WAITING_CHARACTER_ANSWER','CHARACTER_CONFIRMED','MARKER_02_UNLOCKED','LOG_ACTIVE','LOG_CONFIRMED','MARKER_03_UNLOCKED','FILE_ACTIVE','FILE_CONFIRMED','SYSTEM_INTRUSION','EPISODE_COMPLETE']
  for (const step of states) for (const lastAnswer of ['YES','NO']) for (let intrusionIndex=0; intrusionIndex<=episode.intrusion.length; intrusionIndex++) walk(getView({step,lastAnswer,intrusionIndex}))
  walk(load('games/pixel-quest/episodes/ar-initiation/content.js'))
  const {nullEscapeContent} = load('games/pixel-quest/episodes/null-escape/content.js')
  walk(nullEscapeContent)
  walk(load('games/pixel-quest/episodes/null-escape/dialogues.js'))
  for (const hint of Object.values(nullEscapeContent.hints)) add('Система', hint)
  const {partIds, partsChecklist} = load('games/pixel-quest/episodes/null-escape/collect-config.js')
  for (let mask=0; mask < 2 ** partIds.length; mask++) add('Система', partsChecklist(partIds.filter((_,i)=>mask & (1 << i))))
  return [...clips.values()].sort((a,b)=>a.file.localeCompare(b.file))
}
if (require.main === module) {
  const target = path.resolve(__dirname, '../tmp/voice-lines.json')
  fs.mkdirSync(path.dirname(target), {recursive:true})
  fs.writeFileSync(target, JSON.stringify(collectSpeech(), null, 2))
  console.log(`Collected ${collectSpeech().length} unique speech clips: ${target}`)
}
module.exports = {collectSpeech}
