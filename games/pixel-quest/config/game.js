import {createMechanicRegistry} from '../../../platform/core/mechanic-registry'
import {sequenceMechanic} from '../../../platform/modules/mechanics/sequence'
import {chooseMechanic} from '../../../platform/modules/mechanics/choose'
import {collectMechanic} from '../../../platform/modules/mechanics/collect'
import {touchMechanic} from '../../../platform/modules/mechanics/touch'
import {discoverMechanic} from '../../../platform/modules/mechanics/discover'
import {scanMechanic} from '../../../platform/modules/mechanics/scan'
import {createUI} from '../../../platform/ui/quest-ui'
import {createPixelAudio} from '../../../platform/modules/audio/pixel-audio'
import {createAnalytics} from '../../../platform/modules/analytics/analytics'
import {pixelCues} from './audio-cues'

// Explicit factory composition, not a dynamic plugin registry.
export const game = {
  id: 'pixel-quest',
  title: 'Pixel Quest',
  mechanics: createMechanicRegistry([scanMechanic, discoverMechanic, touchMechanic, collectMechanic, chooseMechanic, sequenceMechanic]),
  modules: {
    audio: {create: () => createPixelAudio(pixelCues)},
    analytics: {create: createAnalytics},
  },
}

export const createGameUI = onAction => createUI(onAction, {
  title: game.title,
  createAudio: game.modules.audio.create,
  formatActionLabel: label => label.replace('Журнал прочитан', 'Журнал прослушан').replace('Файл прочитан', 'Файл прослушан'),
  formatSpeech: text => text.replace(/^SYSTEM:/, 'Система.').replace(/^UNKNOWN USER:/, 'Неизвестный пользователь.'),
})
