import {createButtonCarousel} from './button-carousel'
const silentAudio = () => ({unlock() {}, stop() {}, dispose() {}, play(_name, done) { done() }})

export function createUI(onAction, {
  title = 'AR Quest', createAudio = silentAudio,
  formatActionLabel = label => label, formatSpeech = text => text,
} = {}) {
  const root = document.createElement('section')
  root.className = 'quest-ui'
  root.setAttribute('aria-label', title)
  root.innerHTML = '<div class="quest-content" tabindex="0" aria-label="Задание и сообщения"><div class="quest-task"></div><p class="quest-system" hidden></p><p class="quest-character" hidden></p><p class="quest-audio-status" role="status"></p><p class="quest-status" role="status"></p><p class="quest-fullscreen-status" role="status"></p></div><div class="quest-carousel" aria-label="Кнопки: листайте влево и вправо, нажимайте центральную"><button type="button" class="quest-search-toggle" hidden aria-expanded="false">Показать инструкцию</button><div class="quest-panel"><div class="quest-actions"></div></div><div class="quest-actions quest-audio"><button type="button" class="quest-enable">Включить озвучку</button><button type="button" class="quest-repeat" hidden>Повторить реплику</button><button type="button" class="quest-text">Показать текст</button><button type="button" class="quest-fullscreen" aria-pressed="false">На весь экран</button></div></div>'
  document.body.appendChild(root)
  const carousel = createButtonCarousel(root.querySelector('.quest-carousel'))
  const searchToggle = root.querySelector('.quest-search-toggle')
  const panelContent = root.querySelector('.quest-content')
  const searchFrame = document.createElement('div')
  searchFrame.className = 'quest-search-frame'
  searchFrame.hidden = true
  searchFrame.setAttribute('aria-hidden', 'true')
  searchFrame.innerHTML = '<span>Центр объекта — в рамку на полсекунды</span><i></i>'
  const searchHint = document.createElement('p')
  searchHint.className = 'quest-search-hint'
  searchHint.hidden = true
  searchFrame.appendChild(searchHint)
  document.body.appendChild(searchFrame)
  let searchRadius = null
  let searchExpanded = false
  function positionSearchFrame() {
    if (searchRadius === null) return
    const canvas = document.querySelector('a-scene canvas')
    const rect = canvas && canvas.getBoundingClientRect()
    const width = rect && rect.width || window.innerWidth
    const height = rect && rect.height || window.innerHeight
    searchFrame.style.left = ((rect && rect.left || 0) + width / 2) + 'px'
    searchFrame.style.top = ((rect && rect.top || 0) + height / 2) + 'px'
    searchFrame.style.width = width * searchRadius + 'px'
    searchFrame.style.height = height * searchRadius + 'px'
  }
  function updateSearchPanel() {
    const active = searchRadius !== null
    searchToggle.hidden = !active
    panelContent.hidden = active && !searchExpanded
    root.querySelector('.quest-panel').hidden = active && !searchExpanded
    root.querySelector('.quest-audio').hidden = active && !searchExpanded
    searchToggle.textContent = searchExpanded ? 'Вернуться к поиску' : 'Показать инструкцию'
    searchToggle.setAttribute('aria-expanded', String(searchExpanded))
    searchFrame.hidden = !active || searchExpanded
    positionSearchFrame()
    carousel.refresh(active ? searchToggle : null)
  }
  searchToggle.addEventListener('click', () => { searchExpanded = !searchExpanded; updateSearchPanel() })
  window.addEventListener?.('resize', positionSearchFrame)
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
  const effects = createAudio()
  let enabled = false
  let showText = !supported
  let current = {}
  let generation = 0
  let pending = []
  let watchdog
  let disposed = false
  const fullscreenButton = root.querySelector('.quest-fullscreen')
  const fullscreenStatus = root.querySelector('.quest-fullscreen-status')
  const page = document.documentElement
  const requestFullscreen = page?.requestFullscreen || page?.webkitRequestFullscreen
  const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen
  const fullscreenAvailable = !!(requestFullscreen && exitFullscreen &&
    (page.requestFullscreen ? document.fullscreenEnabled !== false : document.webkitFullscreenEnabled !== false))
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement
  function updateFullscreen() {
    if (disposed) return
    const active = !!fullscreenElement()
    fullscreenButton.hidden = !fullscreenAvailable
    fullscreenButton.textContent = active ? 'Выйти из полного экрана' : 'На весь экран'
    fullscreenButton.setAttribute('aria-pressed', String(active))
    fullscreenStatus.textContent = fullscreenAvailable ? '' : 'Этот браузер не поддерживает полный экран для страницы.'
    positionSearchFrame()
    carousel.refresh()
  }
  const toggleFullscreen = async () => {
    if (disposed || !fullscreenAvailable || fullscreenButton.disabled) return
    fullscreenButton.disabled = true
    fullscreenStatus.textContent = ''
    try {
      // Request the whole document so camera, AR canvas and HTML UI stay together.
      if (fullscreenElement()) await exitFullscreen.call(document)
      else await requestFullscreen.call(page, {navigationUI: 'hide'})
      updateFullscreen()
    } catch (_) {
      if (!disposed) fullscreenStatus.textContent = 'Браузер не разрешил переключить полный экран. Откройте игру напрямую в браузере и попробуйте ещё раз.'
    } finally {
      if (!disposed) fullscreenButton.disabled = false
    }
  }
  fullscreenButton.addEventListener('click', toggleFullscreen)
  document.addEventListener('fullscreenchange', updateFullscreen)
  document.addEventListener('webkitfullscreenchange', updateFullscreen)
  updateFullscreen()
  function updateText() {
    system.hidden = character.hidden = !showText
    text.textContent = showText ? 'Скрыть текст' : 'Показать текст'
    carousel.refresh()
  }
  function stopSpeech() {
    generation += 1
    clearTimeout(watchdog)
    pending = []
    effects.stop()
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
    const lines = [['Система', current.system, current.systemCue || 'notification'], ['Персонаж', current.character, 'character']].filter(([, line]) => line)
    repeat.hidden = !lines.length
    carousel.refresh()
    audioStatus.textContent = ''
    let index = 0
    const playNext = () => {
      if (token !== generation || disposed) return
      const utterance = pending[index]
      if (!utterance) { audioStatus.textContent = ''; return }
      const start = () => {
        if (token !== generation || disposed) return
        watchdog = setTimeout(fail, 10000)
        try { synth.resume(); synth.speak(utterance) } catch (_) { fail() }
      }
      if (utterance.cue) effects.play(utterance.cue, start)
      else start()
    }
    pending = lines.flatMap(([speaker, line, cue]) => line.split(/\n+|(?<=[.!?])\s+/).filter(part => part.trim()).map((part, partIndex) => {
      const utterance = new window.SpeechSynthesisUtterance(formatSpeech(part))
      utterance.cue = partIndex === 0 ? cue : null
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
        } else { index += 1; playNext() }
      }
      return utterance
    }))
    if (!pending.length) return
    playNext()
  }
  enable.addEventListener('click', () => {
    enabled = !enabled
    enable.textContent = enabled ? 'Выключить озвучку' : 'Включить озвучку'
    repeat.hidden = !enabled
    if (enabled) { effects.unlock(); speak() }
    else {
      stopSpeech()
      audioStatus.textContent = 'Озвучка выключена.'
      showText = true
      updateText()
    }
  })
  repeat.addEventListener('click', () => { effects.unlock(); speak() })
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
    searchHint(message = '') { searchHint.textContent = message; searchHint.hidden = !message },
    searchMode(radius = null) {
      searchRadius = radius
      searchExpanded = false
      updateSearchPanel()
    },
    render(view) {
      current = view
      if (view.showText) { showText = true; updateText() }
      panelContent.scrollTop = 0
      task.textContent = view.task || ''
      system.textContent = view.system || ''
      character.textContent = view.character || ''
      actions.replaceChildren()
      for (const choice of view.actions || []) {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = formatActionLabel(choice.label)
        button.addEventListener('click', () => onAction(choice.id), {once: true})
        actions.appendChild(button)
      }
      speak()
      carousel.refresh(searchRadius !== null ? searchToggle : actions.querySelector('button'))
    },
    tracking(message = '') { status.textContent = message },
    dispose() {
      disposed = true
      carousel.dispose()
      stopSpeech()
      effects.dispose()
      document.removeEventListener('visibilitychange', visibility)
      document.removeEventListener('fullscreenchange', updateFullscreen)
      document.removeEventListener('webkitfullscreenchange', updateFullscreen)
      fullscreenButton.removeEventListener('click', toggleFullscreen)
      window.removeEventListener?.('resize', positionSearchFrame)
      searchFrame.remove()
      root.remove()
    },
  }
}
