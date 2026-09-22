export function createUI(onAction) {
  const root = document.createElement('section')
  root.className = 'quest-ui'
  root.setAttribute('aria-label', 'Pixel Quest')
  root.innerHTML = '<div class="quest-task"></div><div class="quest-panel" aria-live="polite"><p class="quest-system"></p><p class="quest-character"></p><div class="quest-actions"></div></div><p class="quest-status" role="status"></p>'
  document.body.appendChild(root)
  const task = root.querySelector('.quest-task')
  const system = root.querySelector('.quest-system')
  const character = root.querySelector('.quest-character')
  const actions = root.querySelector('.quest-actions')
  const status = root.querySelector('.quest-status')
  // Keep UI taps away from A-Frame's mouse raycaster.
  const stop = event => event.stopPropagation()
  for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click']) {
    root.addEventListener(type, stop)
  }
  return {
    render(view) {
      task.textContent = view.task || ''
      system.textContent = view.system || ''
      character.textContent = view.character || ''
      actions.replaceChildren()
      for (const choice of view.actions || []) {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = choice.label
        button.addEventListener('click', () => onAction(choice.id), {once: true})
        actions.appendChild(button)
      }
    },
    tracking(message = '') { status.textContent = message },
    dispose() { root.remove() },
  }
}