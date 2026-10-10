export function createScenarioDebug(runner, scenario) {
  if (!runner.debug) return {dispose() {}}
  const root = document.createElement('aside')
  root.style.cssText = 'position:fixed;top:0;left:0;z-index:10000;background:#111e;color:white;padding:8px;font:12px monospace;max-width:90vw'
  const status = document.createElement('div')
  const select = document.createElement('select')
  for (const step of scenario.steps) {
    const option = document.createElement('option'); option.value = step.step_id; option.textContent = step.step_id; select.appendChild(option)
  }
  root.append(status, select)
  for (const [label, action] of [
    ['GO', () => runner.debug.jump(select.value)],
    ['RETRY', () => runner.retryCurrent()],
    ['NEXT', () => { const next = runner.getSnapshot().step?.next.success; if (next) runner.debug.jump(next) }],
  ]) { const button = document.createElement('button'); button.textContent = label; button.onclick = action; root.appendChild(button) }
  for (const type of ['pointerdown', 'pointerup', 'click']) root.addEventListener(type, event => event.stopPropagation())
  document.body.appendChild(root)
  const update = () => {
    const s = runner.getSnapshot()
    status.textContent = ['DEBUG', s.scenario_state, s.scene_id, s.scene_phase, s.step?.mechanic_id, JSON.stringify(s.mechanic?.progress)].join(' | ')
  }
  const off = runner.on('*', update, {critical: false}); update()
  return {dispose() {off(); root.remove()}}
}
