const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {collectSpeech} = require('../scripts/collect-voice-lines.cjs')
const folder = path.resolve(__dirname, '../games/pixel-quest/assets/voices/ru-RU')
test('all spoken branches of three episodes have valid local PCM recordings and matching manifest text', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'))
  const expected = collectSpeech()
  assert.equal(Object.keys(manifest.clips).length, expected.length)
  for (const line of expected) {
    const clip = manifest.clips[line.key]
    assert(clip, 'Missing '+line.key)
    assert.equal(clip.text,line.text)
    assert.equal(clip.speaker,line.speaker)
    assert.match(clip.file,/^[a-f0-9]{24}\.wav$/)
    const wave = fs.readFileSync(path.join(folder,clip.file))
    assert.equal(wave.toString('ascii',0,4),'RIFF')
    assert.equal(wave.toString('ascii',8,12),'WAVE')
    assert.equal(wave.readUInt32LE(4),wave.length-8)
    assert(wave.length > 44)
    // WAV may include extra metadata chunks; locate fmt and data rather than assuming a fixed header.
    let dataLength = 0
    for(let offset=12;offset+8<=wave.length;) {
      const name=wave.toString('ascii',offset,offset+4), size=wave.readUInt32LE(offset+4)
      if(name==='fmt ') {
        assert.equal(wave.readUInt16LE(offset+8),1)
        assert.equal(wave.readUInt16LE(offset+10),1)
        assert.equal(wave.readUInt32LE(offset+12),22050)
      }
      if(name==='data') dataLength=size
      offset += 8 + size + (size%2)
    }
    assert(dataLength>0, 'Empty PCM data '+line.file)
  }
})
