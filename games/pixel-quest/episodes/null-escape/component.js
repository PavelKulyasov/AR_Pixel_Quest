import {createMechanicEpisodeComponent} from '../../../../platform/ar/mechanic-episode-component'
import {game, createGameUI} from '../../config/game'
import {nullEscapeScenario} from './scenario'
import {nullEscapeContent} from './content'
import {createPresentation} from './presentation'
import {createNullEscapeVisual} from './visuals'
export const nullEscapeComponent = createMechanicEpisodeComponent({
  gameId: game.id, scenario: nullEscapeScenario, content: nullEscapeContent,
  registry: game.mechanics, createUI: createGameUI, createPresentation,
  createVisual: createNullEscapeVisual, autoStart: false,
  debug: typeof __AR_DEBUG__ !== 'undefined' && __AR_DEBUG__,
})
