export const sequenceConfig = {
  symbols: [
    {id: 'symbol_diamond', label: 'Ромб', visual: 'diamond'},
    {id: 'symbol_circle', label: 'Круг', visual: 'circle'},
    {id: 'symbol_triangle', label: 'Треугольник', visual: 'triangle'},
    {id: 'symbol_square', label: 'Квадрат', visual: 'square'},
  ].map((symbol, index) => ({...symbol, color: '#57c9ff', offset: {x: .7 + index * 1.1, y: 1.6, z: 0}})),
  sequence: ['symbol_diamond', 'symbol_triangle', 'symbol_circle'],
  display_speed: 800, gap_ms: 400,
  hints: [{after_ms: 15000, content_id: 'sequence_help'}],
}
export const symbolIds = sequenceConfig.symbols.map(symbol => symbol.id)
