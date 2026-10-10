import {createEpisodeComponent} from '../../../../platform/ar/episode-component'
import {createEpisodeController} from './controller'
import {episode} from './config'
import {game, createGameUI} from '../../config/game'

export const episodeComponent = createEpisodeComponent({
  episode,
  createController: options => createEpisodeController({...options, analyticsFactory: game.modules.analytics.create}),
  createUI: createGameUI,
})
