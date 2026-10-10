import {sequenceConfig} from './sequence-config'
import {chooseConfig} from './choose-config'
import {collectConfig} from './collect-config'
const object = (id, visual, color, x, y, z) => ({id: 'null_escape_' + id, visual, color, marker_id: 'START_MARKER', offset: {x, y, z}})
export const objects = {
  terminal_display: object('terminal_display', 'terminal_display', '#57c9ff', 0, .37, .11),
  anomaly_silhouette: object('anomaly_silhouette', 'silhouette', '#050414', -.85, .45, -.04),
  ...Object.fromEntries(sequenceConfig.symbols.map(symbol => [symbol.id, {...symbol, id: 'null_escape_' + symbol.id, marker_id: 'START_MARKER'}])),
  ...Object.fromEntries(chooseConfig.cores.map(core => [core.id, {...core, id: 'null_escape_' + core.id, marker_id: 'START_MARKER'}])),
  ...Object.fromEntries(collectConfig.parts.map(part => [part.id, {...part, id: 'null_escape_' + part.id, marker_id: 'START_MARKER'}])),
  null_assembled: object('null_assembled', 'assembled', '#89e8ff', 2.5, .55, 0),
  null_head: object('null_head', 'head', '#89e8ff', 2.5, .55, 0),
  terminal: object('terminal', 'terminal', '#36bed6', 0, 0, 0),
  null: object('null', 'null', '#89e8ff', .75, .4, 0),
  red_button: object('red_button', 'button', '#ff303b', 0, .18, .2),
  portal: object('portal', 'portal', '#b557ff', -.85, .45, -.1),
}
