import {finaleDialogues} from './finale-config'
export function createFinalePresentation({runner, objects}) {
  const overlay = document.createElement('div')
  overlay.className = 'null-escape-glitch'; overlay.hidden = true; overlay.setAttribute('aria-hidden', 'true')
  document.body.appendChild(overlay)
  let text = '', applied = null, glitch = false
  function reset() {text = ''; applied = null; glitch = false; overlay.hidden = true}
  const off = runner.on('*', event => {
    if (['scenario.step_changed', 'scenario.completed', 'scenario.error'].includes(event.type)) reset()
    if (event.type === 'scenario.paused') overlay.hidden = true
    if (event.type === 'scenario.resumed') overlay.hidden = !glitch
    if (event.type !== 'scene.command' || event.step_id !== 'portal_finale') return
    const command = event.payload.command
    if (command.type === 'dialogue') {
      const view = finaleDialogues[command.id]
      if (!view) return
      if (view.terminalText !== undefined) text = view.terminalText
      glitch = !!view.screenGlitch; overlay.hidden = !glitch || runner.getSnapshot().paused
    }
  })
  return {
    tick() {
      const visual = objects.getVisual3D('terminal_display')
      if (visual?.userData.setTerminalText && text !== applied) {
        visual.userData.setTerminalText(text); applied = text
      }
    },
    dispose() {off(); overlay.remove()},
  }
}
