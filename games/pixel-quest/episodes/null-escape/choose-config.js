export const chooseConfig = {
  correctCore: 'core_03',
  cores: ['core_01', 'core_02', 'core_03', 'core_04'].map((id, index) => ({
    id, visual: 'energy', color: '#ffc857', offset: {x: .4 + index * 1.2, y: 1.6, z: 0},
  })),
  // Each full cycle lasts 2320 ms. Only the correct core has two short pulses.
  correctPattern: [300, 220, 300, 1500],
  falsePatterns: [[300, 2020], [220, 180, 220, 180, 220, 1300], [1100, 1220]],
  hints: [{after_ms: 15000, content_id: 'choose_rule'}, {after_ms: 30000, content_id: 'choose_watch'}],
}
export const coreIds = chooseConfig.cores.map(core => core.id)
export function corePattern(id, config = chooseConfig) {
  if (id === config.correctCore) return config.correctPattern
  const index = config.cores.filter(core => core.id !== config.correctCore).findIndex(core => core.id === id)
  if (index < 0 || !config.falsePatterns[index]) throw new Error('Missing core pulse pattern')
  return config.falsePatterns[index]
}
