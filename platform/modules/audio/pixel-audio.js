export function createPixelAudio(pixelCues = {}) {
  let context
  let disposed = false
  let generation = 0
  let timer
  const nodes = new Set()
  function stop() {
    generation += 1
    clearTimeout(timer)
    for (const {oscillator, gain} of nodes) {
      oscillator.onended = null
      try { oscillator.stop() } catch (_) { /* already stopped */ }
      oscillator.disconnect()
      gain.disconnect()
    }
    nodes.clear()
  }
  function unlock() {
    if (disposed) return Promise.resolve()
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!context && AudioContext) context = new AudioContext()
      return Promise.resolve(context && context.state === 'suspended' ? context.resume() : undefined).catch(() => {})
    } catch (_) { return Promise.resolve() }
  }
  return {
    unlock,
    play(name, done) {
      stop()
      const token = generation
      let finished = false
      const finish = () => {
        if (finished || token !== generation || disposed) return
        finished = true
        stop()
        done()
      }
      if (disposed) return
      if (!context || !pixelCues[name]) { finish(); return }
      const schedule = () => {
        if (finished || token !== generation || disposed) return
        clearTimeout(timer)
        if (context.state !== 'running') { finish(); return }
        try {
          let time = context.currentTime + .015
          for (const [frequency, duration] of pixelCues[name]) {
            if (frequency) {
              const oscillator = context.createOscillator()
              const gain = context.createGain()
              const node = {oscillator, gain}
              nodes.add(node)
              oscillator.type = name === 'character' ? 'triangle' : 'square'
              oscillator.frequency.setValueAtTime(frequency, time)
              gain.gain.setValueAtTime(0, time)
              gain.gain.linearRampToValueAtTime(.055, time + .008)
              gain.gain.setValueAtTime(.055, time + duration - .025)
              gain.gain.linearRampToValueAtTime(0, time + duration)
              oscillator.connect(gain)
              gain.connect(context.destination)
              oscillator.onended = () => {
                oscillator.disconnect()
                gain.disconnect()
                nodes.delete(node)
              }
              oscillator.start(time)
              oscillator.stop(time + duration)
            }
            time += duration + .012
          }
          timer = setTimeout(finish, (time - context.currentTime) * 1000 + 30)
        } catch (_) { finish() }
      }
      // A blocked audio context must never block the dialogue.
      timer = setTimeout(finish, 800)
      unlock().then(schedule, finish)
    },
    stop,
    dispose() {
      disposed = true
      stop()
      if (context && context.state !== 'closed') {
        try { Promise.resolve(context.close()).catch(() => {}) } catch (_) { /* unavailable */ }
      }
    },
  }
}
