import {createMechanicLifecycle} from '../../core/mechanic-lifecycle'

export const chooseMechanic = {
  mechanic_id: 'AR-06', mechanic: 'CHOOSE', api_version: 1, requires: ['objectTouch'],
  validate(config, environment) {
    const ids = config.content.target_ids
    const {correct_target, false_targets, attempt_limit, error_penalty = 'none'} = config.parameters
    if (!Array.isArray(ids) || ids.length < 2 || new Set(ids).size !== ids.length || ids.some(id => !environment.objectIds.includes(id))) throw new Error('Invalid CHOOSE targets')
    if (!ids.includes(correct_target)) throw new Error('Unknown correct_target')
    if (false_targets != null && (!Array.isArray(false_targets) || false_targets.length !== ids.length - 1 || new Set(false_targets).size !== false_targets.length || false_targets.some(id => id === correct_target || !ids.includes(id)))) throw new Error('Invalid false_targets')
    if (attempt_limit != null && (!Number.isInteger(attempt_limit) || attempt_limit < 1)) throw new Error('Invalid attempt_limit')
    if (!['none', 'reset_progress'].includes(error_penalty)) throw new Error('Invalid error_penalty')
    const success = config.success_condition
    if (!success || success.metric !== 'selected_object' || success.op !== 'eq' || success.value !== correct_target) throw new Error('CHOOSE requires selected_object == correct_target')
    if (config.fail_condition != null) throw new Error('CHOOSE supports attempt_limit and time_limit failure only')
  },
  create(config, context) {
    const life = createMechanicLifecycle(config, context, {selected_object: null, attempts: 0})
    const seen = new Set()
    let attempts = 0
    return {
      start: life.start, getSnapshot: life.getSnapshot,
      reset() { if (!life.reset()) return false; seen.clear(); attempts = 0; return true },
      dispose() { seen.clear(); life.dispose() },
      handle(event) {
        if (!life.isActive() || event.type !== 'input.target_touched') return
        const {target_id, interaction_id} = event.payload
        if (!config.content.target_ids.includes(target_id) || typeof interaction_id !== 'string' || !interaction_id.trim() || seen.has(interaction_id)) return
        seen.add(interaction_id)
        if (target_id === config.parameters.correct_target) {
          life.update({selected_object: target_id, attempts}, {current: 1, total: 1})
          context.emit('mechanic.feedback', {type: 'activated', target_id, interaction_id})
          life.succeed()
          return
        }
        attempts += 1
        life.update({selected_object: config.parameters.error_penalty === 'reset_progress' ? null : target_id, attempts}, {current: 0, total: 1})
        context.emit('mechanic.feedback', {type: 'wrong_choice', target_id, interaction_id, attempts, attempt_limit: config.parameters.attempt_limit ?? null})
        if (config.parameters.attempt_limit != null && attempts >= config.parameters.attempt_limit) life.fail('attempt_limit')
      },
    }
  },
}
