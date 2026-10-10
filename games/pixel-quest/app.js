// Copyright (c) 2022 8th Wall, Inc.
import '../../platform/ui/quest-ui.css'
import './styles.css'
import {registerARGame} from '../../platform/ar/register-game'
import {tapPlaceComponent} from './demo/tap-place'
import {episodeComponent} from './episodes/episode-01/component'
import {initiationComponent} from './episodes/ar-initiation/component'
import {nullEscapeComponent} from './episodes/null-escape/component'
import fire from './assets/image-targets/20_Element_Fire.json'
import air from './assets/image-targets/22_Element_Air.json'
import water from './assets/image-targets/23_Element_Water.json'

const nullEscape = new URLSearchParams(window.location.search).get('episode') === 'null-escape'
const initiation = new URLSearchParams(window.location.search).get('episode') === 'ar-initiation'

registerARGame({
  component: nullEscape ? nullEscapeComponent : initiation ? initiationComponent : episodeComponent,
  componentName: nullEscape ? 'null-escape' : initiation ? 'ar-initiation' : 'episode-01',
  imageTargets: [fire, air, water],
  demoComponent: tapPlaceComponent,
})
