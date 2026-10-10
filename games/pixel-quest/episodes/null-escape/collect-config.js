// Positions are local to START_MARKER; gameplay uses only the IDs/count.
export const collectConfig = {
  parts: [
    {id: 'null_body', label: 'Двигатель', visual: 'body', color: '#54caff', offset: {x: 1.8, y: .5, z: .25}},
    {id: 'null_left_arm', label: 'Левая рука', visual: 'left_arm', color: '#89e8ff', offset: {x: 2.5, y: 1.25, z: .15}},
    {id: 'null_right_arm', label: 'Правая рука', visual: 'right_arm', color: '#89e8ff', offset: {x: 3.2, y: .65, z: .2}},
  ],
  hints: [{after_ms: 15000, content_id: 'collect_help'}, {after_ms: 30000, content_id: 'collect_highlight'}],
}
export const partIds = collectConfig.parts.map(part => part.id)
export function partsChecklist(collected = []) {
  return ['Голова ✓', ...collectConfig.parts.map(part => part.label + (collected.includes(part.id) ? ' ✓' : ' ✕'))].join(' · ')
}
