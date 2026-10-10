export function createAudioDirector(createAudio) {
  const channels = Object.fromEntries(['UI', 'GAMEPLAY', 'STORY'].map(name => [name, createAudio()]))
  return {
    unlock() { Object.values(channels).forEach(channel => channel.unlock()) },
    play(category, cue) { channels[category]?.play(cue, () => {}) },
    stop() { Object.values(channels).forEach(channel => channel.stop()) },
    dispose() { Object.values(channels).forEach(channel => channel.dispose()) },
  }
}
