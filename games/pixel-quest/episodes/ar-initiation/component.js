import {createMechanicEpisodeComponent} from '../../../../platform/ar/mechanic-episode-component'
import {game, createGameUI} from '../../config/game'
import {initiationScenario} from './scenario'
import {initiationContent} from './content'

export const initiationComponent = createMechanicEpisodeComponent({
  gameId: game.id,
  scenario: initiationScenario,
  content: initiationContent,
  registry: game.mechanics,
  createUI: createGameUI,
  sink: event => console.info('[AR Initiation]', event),
})
