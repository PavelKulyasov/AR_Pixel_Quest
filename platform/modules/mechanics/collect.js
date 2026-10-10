import {createMechanicLifecycle} from '../../core/mechanic-lifecycle'

export const collectMechanic = {
  mechanic_id: 'AR-05', mechanic: 'COLLECT', api_version: 1, requires: ['objectTouch'],
  validate(config, environment) {
    const ids = config.content.target_ids
    const {target_count: count, collection_order: order = 'any'} = config.parameters
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !environment.objectIds.includes(id))) throw new Error('Invalid COLLECT targets')
    if (!Number.isInteger(count) || count < 1 || count > ids.length) throw new Error('Unreachable COLLECT target_count')
    if (order !== 'any' && (!Array.isArray(order) || order.length !== count || new Set(order).size !== count || order.some(id => !ids.includes(id)))) throw new Error('Invalid collection_order')
    const success = config.success_condition
    if (!success || success.metric !== 'collected_count' || success.op !== 'eq' || success.value !== count) throw new Error('COLLECT requires collected_count == target_count')
    if (config.fail_condition != null) throw new Error('COLLECT supports time_limit failure only')
  },
  create(config, context) {
    const life = createMechanicLifecycle(config, context, {collected_ids: [], collected_count: 0})
    const collected = new Set()
    const interactions = new Set()
    const count = config.parameters.target_count
    const report = () => life.update({collected_ids: [...collected], collected_count: collected.size}, {current: collected.size, total: count})
    return {
      start() { if (life.start()) report() },
      reset() { if (!life.reset()) return false; collected.clear(); interactions.clear(); return true },
      dispose() { collected.clear(); interactions.clear(); life.dispose() },
      getSnapshot: life.getSnapshot,
      handle(event) {
        if (!life.isActive() || event.type !== 'input.target_touched') return
        const {target_id, interaction_id} = event.payload
        if (!config.content.target_ids.includes(target_id) || collected.has(target_id) || typeof interaction_id !== 'string' || !interaction_id.trim() || interactions.has(interaction_id)) return
        interactions.add(interaction_id)
        const order = config.parameters.collection_order ?? 'any'
        if (Array.isArray(order) && target_id !== order[collected.size]) {
          context.emit('mechanic.feedback', {type: 'wrong_order', target_id, expected_target_id: order[collected.size]})
          return
        }
        collected.add(target_id)
        report()
        context.emit('mechanic.feedback', {type: 'collected', target_id, interaction_id})
        if (collected.size === count) life.succeed()
      },
    }
  },
}
