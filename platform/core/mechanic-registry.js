import {mechanicCatalog} from '../modules/mechanics/catalog'

export function createMechanicRegistry(definitions = []) {
  const factories = new Map()
  for (const definition of definitions) {
    const canonical = mechanicCatalog.find(item => item.mechanic_id === definition.mechanic_id)
    if (!canonical || canonical.mechanic !== definition.mechanic) throw new Error('Invalid canonical mechanic ID/name')
    if (factories.has(definition.mechanic_id)) throw new Error('Duplicate mechanic: ' + definition.mechanic_id)
    if (definition.api_version !== 1 || !Array.isArray(definition.requires) ||
        typeof definition.validate !== 'function' || typeof definition.create !== 'function') throw new Error('Invalid mechanic contract')
    factories.set(definition.mechanic_id, definition)
  }
  function validateStep(step, environment) {
    if (!step || typeof step.step_id !== 'string' || !step.step_id) throw new Error('step_id is required')
    const definition = factories.get(step.mechanic_id)
    if (!definition) throw new Error('Mechanic is not implemented/registered: ' + step.mechanic_id)
    if (step.mechanic !== definition.mechanic) throw new Error('Mechanic ID/name mismatch')
    for (const capability of definition.requires) {
      if (!environment.capabilities.includes(capability)) throw new Error('Missing capability: ' + capability)
    }
    if (!step.parameters || !step.content) throw new Error('Step content and parameters are required')
    const limit = step.parameters.time_limit
    if (limit != null && (!Number.isFinite(limit) || limit <= 0)) throw new Error('time_limit must be positive milliseconds or null')
    if (step.difficulty != null && ![1, 2, 3, 4].includes(step.difficulty)) throw new Error('Invalid difficulty')
    if (step.advance != null && !['manual', 'auto'].includes(step.advance)) throw new Error('Invalid advance policy')
    if (step.hints != null && !Array.isArray(step.hints)) throw new Error('hints must be an array')
    for (const hint of step.hints || []) {
      if (!Number.isFinite(hint.after_ms) || hint.after_ms < 0 || !environment.hintIds.includes(hint.content_id)) throw new Error('Invalid hint')
    }
    if (!step.next || !Object.prototype.hasOwnProperty.call(step.next, 'success') ||
        !Object.prototype.hasOwnProperty.call(step.next, 'fail')) throw new Error('Both success and fail transitions are required')
    if (Object.keys(step.next).some(key => !['success', 'fail'].includes(key))) throw new Error('Unknown transition outcome')
    for (const next of Object.values(step.next)) {
      if (next !== null && (typeof next !== 'string' || !next)) throw new Error('Invalid next step')
    }
    definition.validate(step, environment)
    return definition
  }
  return {
    validateStep,
    create(step, context, environment) {
      const definition = validateStep(step, environment)
      const instance = definition.create(step, context)
      if (!instance || ['start', 'handle', 'getSnapshot', 'reset', 'dispose'].some(name => typeof instance[name] !== 'function')) {
        if (instance && typeof instance.dispose === 'function') instance.dispose()
        throw new Error('Invalid mechanic instance')
      }
      return instance
    },
  }
}
