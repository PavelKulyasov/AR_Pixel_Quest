// Only adapts XR events and target identity; does not interpret the story.
export function createMarkerManager(scene, targets, {found, updated, lost}) {
  const tracked = new Map()
  const resolve = detail => detail && Object.prototype.hasOwnProperty.call(targets, detail.name)
    ? targets[detail.name] : null
  const update = ({detail}) => {
    const id = resolve(detail)
    if (!id) return
    const first = !tracked.has(id)
    // XR event payloads may be reused by the engine. Retain a value snapshot.
    tracked.set(id, {...detail,
      position: detail.position && {...detail.position},
      rotation: detail.rotation && {...detail.rotation},
    })
    if (first) found(id, detail)
    updated(id, detail)
  }
  const lose = ({detail}) => {
    const id = resolve(detail)
    if (!id || !tracked.has(id)) return
    tracked.delete(id)
    lost(id)
  }
  scene.addEventListener('xrimagefound', update)
  scene.addEventListener('xrimageupdated', update)
  scene.addEventListener('xrimagelost', lose)
  return {
    tracked,
    dispose() {
      scene.removeEventListener('xrimagefound', update)
      scene.removeEventListener('xrimageupdated', update)
      scene.removeEventListener('xrimagelost', lose)
      tracked.clear()
    },
  }
}