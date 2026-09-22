import {createGameState} from '../../game/game-state'
import {createAnalytics} from '../../game/analytics'
import {episode, getView} from './config'

export function createEpisodeController({render = () => {}, sink} = {}) {
  const store = createGameState(episode.id, Object.keys(episode.objects))
  const {state} = store
  Object.assign(state, {
    marker01Found: false, characterInteracted: false,
    marker02Found: false, logRead: false,
    marker03Found: false, fileRead: false,
    lastAnswer: null, intrusionIndex: 0,
  })
  const track = createAnalytics(episode.id, sink)
  const publish = () => render(getView(state), state)
  const event = name => track(name, state.step)
  let disposed = false
  return {
    state,
    start() {
      if (disposed || state.step !== 'START') return
      store.move('SEARCH_CHARACTER')
      event('episode_started')
      publish()
    },
    detect(id) {
      if (disposed || !store.find(id)) return false
      if (id === 'MARKER_01') {
        store.move('MARKER_01_DETECTED', {marker01Found: true})
        event('marker_01_found')
        store.move('CHARACTER_ACTIVE')
        store.move('WAITING_CHARACTER_ANSWER')
      } else if (id === 'MARKER_02') {
        store.move('LOG_ACTIVE', {marker02Found: true})
        event('marker_02_found')
        event('log_opened')
        event('admin_access_seen')
      } else if (id === 'MARKER_03') {
        store.move('FILE_ACTIVE', {marker03Found: true})
        event('marker_03_found')
        event('file_opened')
      }
      publish()
      return true
    },
    action(action) {
      if (disposed || state.completed) return false
      if (state.step === 'WAITING_CHARACTER_ANSWER' && ['YES', 'NO'].includes(action)) {
        event('character_interaction')
        state.lastAnswer = action
        track(action === 'YES' ? 'character_answer_yes' : 'character_answer_no', state.step, false)
        if (action === 'YES') store.move('CHARACTER_CONFIRMED', {characterInteracted: true})
      } else if (state.step === 'CHARACTER_CONFIRMED' && action === 'NEXT') {
        store.completeMarker('MARKER_01', 'MARKER_02')
        store.move('MARKER_02_UNLOCKED')
      } else if (state.step === 'LOG_ACTIVE' && action === 'CONFIRM_LOG') {
        store.move('LOG_CONFIRMED', {logRead: true})
      } else if (state.step === 'LOG_CONFIRMED' && action === 'NEXT') {
        store.completeMarker('MARKER_02', 'MARKER_03')
        store.move('MARKER_03_UNLOCKED')
      } else if (state.step === 'FILE_ACTIVE' && action === 'CONFIRM_FILE') {
        store.move('FILE_CONFIRMED', {fileRead: true})
      } else if (state.step === 'FILE_CONFIRMED' && action === 'NEXT') {
        store.move('SYSTEM_INTRUSION')
        event('anomaly_intervention')
      } else if (state.step === 'SYSTEM_INTRUSION' && action === 'NEXT') {
        if (state.intrusionIndex < episode.intrusion.length) state.intrusionIndex += 1
        else {
          store.completeMarker('MARKER_03')
          store.move('EPISODE_COMPLETE', {completed: true})
          event('episode_completed')
        }
      } else return false
      publish()
      return true
    },
    dispose() { disposed = true },
  }
}