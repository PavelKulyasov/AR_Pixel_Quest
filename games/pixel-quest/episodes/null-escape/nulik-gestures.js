// Dialogue gestures layer over the authored levitation without moving AR anchors.
export function createNulikGestures({runner, objects, dialogues}) {
  const ids = ['null', 'null_assembled', 'null_head']
  let speech = null
  let blocked = false
  const resetPose = () => {
    for (const id of ids) {
      const data = objects.getVisual3D(id)?.userData.nulik
      if (!data) continue
      for (const name of ['head', 'left_arm', 'right_arm']) {
        const part = data.parts[name]
        if (part) part.pivot.quaternion.copy(part.quaternion)
      }
    }
  }
  const say = duration => { speech = {start: runner.getTime(), duration} }
  const off = runner.on('*', event => {
    if (['scenario.step_changed', 'scenario.completed', 'scenario.error'].includes(event.type)) {
      speech = null; blocked = false; resetPose()
    }
    if (event.type === 'scene.command') {
      const c = event.payload.command
      if (c.type === 'dialogue') {
        speech = null
        if (dialogues[c.id]?.character) say(c.duration_ms || 2500)
      }
      if (c.type === 'effect' && c.target === 'null' && c.effect === 'vanish') {
        speech = null; resetPose(); blocked = true
      }
    }
    if (event.type === 'mechanic.feedback' && event.payload.type === 'wrong_choice') say(2800)
    if (event.type === 'mechanic.sequence_requested' && event.payload.reason === 'error') say(2200)
  })
  const {Euler, Quaternion} = AFRAME.THREE
  const angles = new Euler(), rotation = new Quaternion()
  return {
    tick(now) {
      if (blocked) return
      resetPose()
      if (!speech) return
      const elapsed = now - speech.start
      if (elapsed < 0 || elapsed >= speech.duration) { speech = null; return }
      // Ease in and out so each phrase returns gently to the resting pose.
      const weight = Math.min(1, elapsed / 220, (speech.duration - elapsed) / 300)
      const t = elapsed / 1000
      for (const id of ids) {
        if (!objects.getObject3D(id)?.visible) continue
        const data = objects.getVisual3D(id)?.userData.nulik
        if (!data) continue
        for (const [name, part] of Object.entries(data.parts)) {
          if (name === 'body') continue
          if (name === 'head') angles.set(.045 * Math.sin(t * 5.1), .065 * Math.sin(t * 2.3), .025 * Math.sin(t * 3.2))
          else {
            const side = name === 'left_arm' ? 1 : -1
            angles.set(.035 * Math.sin(t * 3.4 + side), .025 * Math.sin(t * 2.1), side * .065 * Math.sin(t * 3 + side))
          }
          angles.set(angles.x * weight, angles.y * weight, angles.z * weight)
          part.pivot.quaternion.copy(part.quaternion).multiply(rotation.setFromEuler(angles))
        }
      }
    },
    dispose() { off(); speech = null; resetPose() },
  }
}
