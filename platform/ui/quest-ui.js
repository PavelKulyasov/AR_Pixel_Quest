import {createButtonCarousel} from './button-carousel'
const silentAudio = () => ({unlock() {}, stop() {}, dispose() {}, play(_name, done) { done() }})

export function createUI(onAction, {
  title = 'AR Quest', createAudio = silentAudio,
  formatActionLabel = label => label, formatSpeech = text => text, resolveSpeechAudio = null,
} = {}) {
  const root = document.createElement('section')
  root.className = 'quest-ui'
  root.setAttribute('aria-label', title)
  root.innerHTML = '<div class="quest-content" aria-label="Задание и сообщения" aria-live="polite"><div class="quest-message-history"></div><div class="quest-task"></div><p class="quest-system" hidden></p><p class="quest-character" hidden></p><p class="quest-audio-status" role="status"></p><p class="quest-status" role="status"></p><p class="quest-fullscreen-status" role="status"></p></div><div class="quest-carousel" aria-label="Кнопки: листайте влево и вправо, нажимайте центральную"><button type="button" class="quest-search-toggle" hidden aria-expanded="false">Показать инструкцию</button><div class="quest-panel"><div class="quest-actions"></div></div><div class="quest-actions quest-audio"><button type="button" class="quest-repeat" hidden>Повторить реплику</button><button type="button" class="quest-text">Показать текст</button></div></div><button type="button" class="quest-enable quest-screen-control" aria-label="Включить озвучку" aria-pressed="false"></button><button type="button" class="quest-fullscreen quest-screen-control" aria-label="На весь экран" aria-pressed="false"></button>'
  document.body.appendChild(root)
  const rowTimers = new Set()
  const history = root.querySelector('.quest-message-history')
  const schedule = (fn, delay) => {
    const timer = setTimeout(() => { rowTimers.delete(timer); fn() }, delay)
    rowTimers.add(timer)
  }
  function message(node, value) {
    // Keep previous lines until their own five seconds expire, even across new views.
    for (const row of [...node.children]) history.appendChild(row)
    node.replaceChildren()
    const context = document.createElement('canvas').getContext?.('2d')
    const width = Math.min((window.innerWidth || 390) * .76, 440) - 20
    if (context) context.font = '500 ' + Math.max(14, Math.min(18, (window.innerHeight || 700) * .02)) + 'px system-ui'
    const lines = []
    for (const paragraph of String(value || '').split('\n').filter(line => line.trim())) {
      let line = ''
      for (const word of paragraph.match(/\S+\s*/g) || []) {
        if (line && context && context.measureText(line + word).width > width) { lines.push(line); line = '' }
        line += word
      }
      lines.push(line)
    }
    lines.forEach((line, index) => {
      const row = document.createElement('span')
      row.className = 'quest-message-line ' + node.className + '-line'
      row.textContent = line + (index < lines.length - 1 ? '\n' : '')
      row.hidden = index > 0
      node.appendChild(row)
      if (index > 0) schedule(() => { row.hidden = false }, index * 200)
      schedule(() => row.remove(), index * 200 + 5000)
    })
  }
  const icon = (button, label, paths) => {
    button.setAttribute('aria-label', label)
    button.setAttribute('title', label)
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>'
  }
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
    if (active && searchExpanded) {
      showText = true; updateText()
      message(task, current.task); message(system, current.system); message(character, current.character)
    }
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
  const localSpeech = Boolean(resolveSpeechAudio && window.Audio)
  const browserSpeech = Boolean(synth && window.SpeechSynthesisUtterance)
  const supported = localSpeech || browserSpeech
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
    icon(fullscreenButton, active ? 'Выйти из полного экрана' : 'На весь экран', active
      ? '<path d="M9 3v6H3m12-6v6h6M3 15h6v6m6 0v-6h6"/>'
      : '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6"/>')
    fullscreenButton.setAttribute('aria-pressed', String(active))
    message(fullscreenStatus, fullscreenAvailable ? '' : 'Этот браузер не поддерживает полный экран для страницы.')
    positionSearchFrame()
    carousel.refresh()
  }
  const toggleFullscreen = async () => {
    if (disposed || !fullscreenAvailable || fullscreenButton.disabled) return
    fullscreenButton.disabled = true
    message(fullscreenStatus, '')
    try {
      // Request the whole document so camera, AR canvas and HTML UI stay together.
      if (fullscreenElement()) await exitFullscreen.call(document)
      else await requestFullscreen.call(page, {navigationUI: 'hide'})
      updateFullscreen()
    } catch (_) {
      if (!disposed) message(fullscreenStatus, 'Браузер не разрешил переключить полный экран. Откройте игру напрямую в браузере и попробуйте ещё раз.')
    } finally {
      if (!disposed) fullscreenButton.disabled = false
    }
  }
  fullscreenButton.addEventListener('click', toggleFullscreen)
  document.addEventListener('fullscreenchange', updateFullscreen)
  document.addEventListener('webkitfullscreenchange', updateFullscreen)
  updateFullscreen()
  function updateText() {
    root.setAttribute('data-show-text', String(showText))
    system.hidden = character.hidden = !showText
    text.textContent = showText ? 'Скрыть текст' : 'Показать текст'
    carousel.refresh()
  }
  function stopSpeech() {
    generation += 1
    clearTimeout(watchdog)
    for (const clip of pending) {
      if (clip.localAudio) { clip.pause(); clip.removeAttribute('src'); clip.load() }
    }
    pending = []
    effects.stop()
    if (browserSpeech) synth.cancel()
  }
  function fail() {
    stopSpeech()
    showText = true
    updateText()
    message(audioStatus, 'Не удалось воспроизвести голос. Нажмите «Повторить реплику» или прочитайте текст.')
  }
  function speak() {
    stopSpeech()
    if (!enabled || !supported || disposed) return
    const token = generation
    const voices = browserSpeech && !localSpeech ? synth.getVoices().filter(voice => /^ru([_-]|$)/i.test(voice.lang)) : []
    const lines = [['Система', current.system, current.systemCue || 'notification'], ['Персонаж', current.character, 'character']].filter(([, line]) => line)
    repeat.hidden = !lines.length
    carousel.refresh()
    message(audioStatus, '')
    let index = 0
    const playNext = () => {
      if (token !== generation || disposed) return
      const utterance = pending[index]
      if (!utterance) { message(audioStatus, ''); return }
      const start = () => {
        if (token !== generation || disposed) return
        watchdog = setTimeout(fail, 10000)
        try {
          if (utterance.localAudio) {
            const playing = utterance.play()
            playing?.catch(() => { if (token === generation && !disposed) fail() })
          } else { synth.resume(); synth.speak(utterance) }
        } catch (_) { fail() }
      }
      if (utterance.cue) effects.play(utterance.cue, start)
      else start()
    }
    try { pending = lines.flatMap(([speaker, line, cue]) => line.split(/\n+|(?<=[.!?])\s+/).filter(part => part.trim()).map((part, partIndex) => {
      const spoken = formatSpeech(part.trim())
      const url = localSpeech ? resolveSpeechAudio(speaker, spoken) : null
      if (localSpeech && !url) throw new Error('Missing local speech recording')
      const utterance = localSpeech ? new window.Audio(url) : new window.SpeechSynthesisUtterance(spoken)
      utterance.localAudio = localSpeech
      if (localSpeech) utterance.preload = 'none'
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
        message(audioStatus, speaker + ' говорит…')
      }
      if (localSpeech) utterance.onplaying = utterance.onstart
      utterance.onerror = () => { if (token === generation && !disposed) fail() }
      utterance.onend = () => {
        if (token !== generation || disposed) return
        clearTimeout(watchdog)
        if (utterance === pending[pending.length - 1]) {
          pending = []
          message(audioStatus, '')
        } else { index += 1; playNext() }
      }
      if (localSpeech) utterance.onended = utterance.onend
      return utterance
    })) } catch (_) { fail(); return }
    if (!pending.length) return
    playNext()
  }
  function updateSoundIcon() {
    icon(enable, enabled ? 'Выключить озвучку' : 'Включить озвучку', '<path d="M11 5 6 9H3v6h3l5 4Z"/>' + (enabled
      ? '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'
      : '<path d="m16 9 5 6m0-6-5 6"/>'))
    enable.setAttribute('aria-pressed', String(enabled))
  }
  updateSoundIcon()
  enable.addEventListener('click', () => {
    enabled = !enabled
    updateSoundIcon()
    repeat.hidden = !enabled
    if (enabled) { effects.unlock(); speak() }
    else {
      stopSpeech()
      message(audioStatus, 'Озвучка выключена.')
      showText = true
      updateText()
    }
  })
  repeat.addEventListener('click', () => { effects.unlock(); speak() })
  text.addEventListener('click', () => { showText = !showText; updateText(); if (showText) { message(task, current.task); message(system, current.system); message(character, current.character) } })
  enable.hidden = !supported
  message(audioStatus, supported ? 'Нажмите значок звука слева вверху, чтобы услышать реплики.' : 'Озвучка недоступна в этом браузере. Реплики показаны текстом.')
  updateText()
  const visibility = () => {
    if (document.hidden) {
      stopSpeech()
      if (enabled) message(audioStatus, 'Нажмите «Повторить реплику», чтобы продолжить прослушивание.')
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
      message(task, view.task || '')
      message(system, view.system || '')
      message(character, view.character || '')
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
    tracking(value = '') { message(status, value) },
    dispose() {
      disposed = true
      for (const timer of rowTimers) clearTimeout(timer)
      rowTimers.clear()
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
