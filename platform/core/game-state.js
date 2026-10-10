// Reusable state store. Episode rules live in the episode configuration/controller.
export function createGameState(episode, markerIds) {
  const state = {
    episode, step: 'START', completed: false,
    markers: Object.fromEntries(markerIds.map((id, i) => [id, i === 0 ? 'AVAILABLE' : 'LOCKED'])),
  }
  return {
    state,
    move(step, patch = {}) { Object.assign(state, patch, {step}) },
    find(id) {
      if (state.completed || state.markers[id] !== 'AVAILABLE') return false
      state.markers[id] = 'FOUND'
      return true
    },
    completeMarker(id, nextId) {
      if (state.markers[id] !== 'FOUND') return false
      state.markers[id] = 'COMPLETED'
      if (nextId) state.markers[nextId] = 'AVAILABLE'
      return true
    },
  }
}