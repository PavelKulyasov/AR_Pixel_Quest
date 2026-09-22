export function createUI(onAction) {
  const root = document.createElement('section')
  root.className = 'quest-ui'
  root.setAttribute('aria-label', 'Pixel Quest')
  root.innerHTML = '<div class="quest-task"></div><div class="quest-panel"><p class="quest-system" hidden></p><p class="quest-character" hidden></p><div class="quest-actions"></div></div><div class="quest-actions quest-audio"><button type="button" class="quest-enable">Включить озвучку</button><button type="button" class="quest-repeat" hidden>Повторить реплику</button><button type="button" class="quest-text">Показать текст</button></div><p class="quest-audio-status" role="status"></p><p class="quest-status" role="status"></p>'
  document.body.appendChild(root)
  const task = root.querySelector('.quest-task')
  const system = root.querySelector('.quest-system')
  const character = root.querySelector('.quest-character')
  const actions = root.querySelector('.quest-actions')
  const status = root.querySelector('.quest-status')
  const audioStatus = root.querySelector('.quest-audio-status')
  const enable = root.querySelector('.quest-enable')
  const repeat = root.querySelector('.quest-repeat')
  const text = root.querySelector('.quest-text')
  const synth = window.speechSynthesis
  const supported = Boolean(synth && window.SpeechSynthesisUtterance)
  let enabled = false
  let showText = !supported
  let current = {}
  let generation = 0
  let pending = []
  let watchdog
  let disposed = false
  function updateText() {
    system.hidden = character.hidden = !showText
    text.textContent = showText ? 'Скрыть текст' : 'Показать текст'
  }
  function stopSpeech() {
    generation += 1
    clearTimeout(watchdog)
    pending = []
    if (supported) synth.cancel()
  }
  function fail() {
    stopSpeech()
    showText = true
    updateText()
    audioStatus.textContent = 'Не удалось воспроизвести голос. Нажмите «Повторить реплику» или прочитайте текст.'
  }
  function speak() {
    stopSpeech()
    if (!enabled || disposed) return
    const token = generation
    const voices = synth.getVoices().filter(voice => /^ru([_-]|$)/i.test(voice.lang))
    const lines = [['Система', current.system], ['Персонаж', current.character]].filter(([, line]) => line)
    repeat.hidden = !lines.length
    audioStatus.textContent = ''
    pending = lines.flatMap(([speaker, line]) => line.split(/\n+|(?<=[.!?])\s+/).filter(part => part.trim()).map(part => {
      const utterance = new window.SpeechSynthesisUtterance(part.replace(/^SYSTEM:/, 'Система.').replace(/^UNKNOWN USER:/, 'Неизвестный пользователь.'))
      utterance.lang = 'ru-RU'
      utterance.rate = speaker === 'Система' ? 0.95 : 1
      utterance.pitch = speaker === 'Система' ? 0.85 : 1.05
      const voice = voices[speaker === 'Персонаж' && voices.length > 1 ? 1 : 0]
      if (voice) utterance.voice = voice
      utterance.onstart = () => {
        if (token !== generation || disposed) return
        clearTimeout(watchdog)
        watchdog = setTimeout(fail, 60000)
        audioStatus.textContent = speaker + ' говорит…'
      }
      utterance.onerror = () => { if (token === generation && !disposed) fail() }
      utterance.onend = () => {
        if (token !== generation || disposed) return
        clearTimeout(watchdog)
        if (utterance === pending[pending.length - 1]) {
          pending = []
          audioStatus.textContent = ''
        } else watchdog = setTimeout(fail, 10000)
      }
      return utterance
    }))
    if (!pending.length) return
    watchdog = setTimeout(fail, 10000)
    try {
      synth.resume()
      pending.forEach(utterance => synth.speak(utterance))
    } catch { fail() }
  }
  enable.addEventListener('click', () => {
    enabled = !enabled
    enable.textContent = enabled ? 'Выключить озвучку' : 'Включить озвучку'
    repeat.hidden = !enabled
    if (enabled) speak()
    else {
      stopSpeech()
      audioStatus.textContent = 'Озвучка выключена.'
      showText = true
      updateText()
    }
  })
  repeat.addEventListener('click', speak)
  text.addEventListener('click', () => { showText = !showText; updateText() })
  enable.hidden = !supported
  audioStatus.textContent = supported ? 'Нажмите «Включить озвучку», чтобы услышать реплики.' : 'Озвучка недоступна в этом браузере. Реплики показаны текстом.'
  updateText()
  const visibility = () => {
    if (document.hidden) {
      stopSpeech()
      if (enabled) audioStatus.textContent = 'Нажмите «Повторить реплику», чтобы продолжить прослушивание.'
    }
  }
  document.addEventListener('visibilitychange', visibility)
  // Keep UI taps away from A-Frame's mouse raycaster.
  const stop = event => event.stopPropagation()
  for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click']) {
    root.addEventListener(type, stop)
  }
  return {
    render(view) {
      current = view
      task.textContent = view.task || ''
      system.textContent = view.system || ''
      character.textContent = view.character || ''
      actions.replaceChildren()
      for (const choice of view.actions || []) {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = choice.label.replace('Журнал прочитан', 'Журнал прослушан').replace('Файл прочитан', 'Файл прослушан')
        button.addEventListener('click', () => onAction(choice.id), {once: true})
        actions.appendChild(button)
      }
      speak()
    },
    tracking(message = '') { status.textContent = message },
    dispose() {
      disposed = true
      stopSpeech()
      document.removeEventListener('visibilitychange', visibility)
      root.remove()
    },
  }
}
