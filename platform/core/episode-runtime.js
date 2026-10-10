// Marker-quest runtime. The game supplies story transitions; adapters supply I/O.
export function createEpisodeRuntime({episode, createController, createUI, createObjects, createMarkers}) {
  const objects = createObjects(episode.objects)
  const ui = createUI(action => controller.action(action))
  const synchronize = () => {
    ui.tracking('')
    for (const id of Object.keys(episode.objects)) {
      const pose = markers.tracked.get(id)
      if (controller.state.completed) objects.hide(id)
      else if (pose && ['FOUND', 'COMPLETED'].includes(controller.state.markers[id])) {
        objects.show(id, pose)
      }
      // A lost marker does not remove an object already placed in the world.
    }
  }
  const controller = createController({
    render(view) {
      ui.render(view)
      synchronize()
      // A previously locked target may still be in view after an unlock.
      for (const id of markers.tracked.keys()) controller.detect(id)
    },
  })
  const markers = createMarkers(episode.targets, {
    found: id => controller.detect(id),
    updated: synchronize,
    lost: synchronize,
  })
  controller.start()
  let disposed = false
  return {
    tick(deltaMs) { if (!disposed) objects.tick?.(deltaMs) },
    dispose() {
      if (disposed) return
      disposed = true
      markers.dispose()
      controller.dispose()
      objects.dispose()
      ui.dispose()
    },
  }
}
