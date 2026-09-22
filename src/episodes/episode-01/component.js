import {createEpisodeController} from './controller'
import {episode} from './config'
import {createMarkerManager} from '../../game/marker-manager'
import {createArObjectManager} from '../../game/ar-object-manager'
import {createUI} from '../../game/ui'

export const episodeComponent = {
  init() {
    const scene = this.el
    const objects = createArObjectManager(scene, episode.objects)
    const ui = createUI(action => controller.action(action))
    const synchronize = () => {
      ui.tracking('')
      for (const id of Object.keys(episode.objects)) {
        const pose = markers.tracked.get(id)
        if (controller.state.markers[id] === 'FOUND') {
          if (pose) objects.show(id, pose)
          else {
            objects.hide(id)
            ui.tracking('Объект потерян. Наведите камеру на маркер.')
          }
        } else objects.hide(id)
      }
    }
    const controller = createEpisodeController({
      render(view) {
        ui.render(view)
        synchronize()
        // A previously locked target may still be in view after an unlock.
        for (const id of markers.tracked.keys()) controller.detect(id)
      },
    })
    const markers = createMarkerManager(scene, episode.targets, {
      found: id => controller.detect(id),
      updated: synchronize,
      lost: synchronize,
    })
    controller.start()
    this.dispose = () => {
      markers.dispose()
      controller.dispose()
      objects.dispose()
      ui.dispose()
    }
  },
  remove() { if (this.dispose) this.dispose() },
}