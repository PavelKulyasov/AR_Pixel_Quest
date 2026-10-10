// Stable vocabulary. Catalog entries are not executable implementations.
const definitions = [
  ['AR-01', 'SCAN', 1, 1], ['AR-02', 'DISCOVER', 1, 1],
  ['AR-03', 'TOUCH', 1, 1], ['AR-04', 'CATCH', 1, 1], ['AR-05', 'COLLECT', 1, 1],
  ['AR-06', 'CHOOSE', 2, 2], ['AR-07', 'SEQUENCE', 2, 2], ['AR-08', 'MATCH', 2, 2],
  ['AR-09', 'ASSEMBLE', 2, 2], ['AR-10', 'AIM', 2, 2], ['AR-11', 'DODGE', 2, 2], ['AR-12', 'FOLLOW', 2, 2],
  ['AR-13', 'ANALYZE', 3, 2], ['AR-14', 'CODE', 3, 2], ['AR-15', 'PUZZLE', 3, 3],
  ['AR-16', 'DEFEND', 4, 3], ['AR-17', 'SYNC', 4, 3], ['AR-18', 'ROLE', 4, 3], ['AR-19', 'CHASE', 4, 3],
  ['AR-20', 'BOSS', 5, 4],
]
export const mechanicCatalog = Object.freeze(definitions.map(([mechanic_id, mechanic, level, difficulty]) =>
  Object.freeze({mechanic_id, mechanic, level, difficulty})))
export const difficultyLevels = Object.freeze({INTRO: 1, NORMAL: 2, CHALLENGE: 3, BOSS: 4})
