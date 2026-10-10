import {createEpisodeRuntime} from '../core/episode-runtime'
import {createMarkerManager} from './marker-manager'
import {createArObjectManager} from './ar-object-manager'

export function createEpisodeComponent({episode, createController, createUI}) {
  return {
    init() {
      this.runtime = createEpisodeRuntime({
        episode, createController, createUI,
        createObjects: definitions => createArObjectManager(this.el, definitions),
        createMarkers: (targets, handlers) => createMarkerManager(this.el, targets, handlers),
      })
    },
    tick(time, deltaMs) { this.runtime?.tick(deltaMs) },
    remove() { if (this.runtime) this.runtime.dispose() },
  }
}
