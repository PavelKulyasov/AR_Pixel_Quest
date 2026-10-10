import {createMechanicLifecycle} from '../../core/mechanic-lifecycle'

export const touchMechanic = {
  mechanic_id: 'AR-03', mechanic: 'TOUCH', api_version: 1, requires: ['objectTouch'],
  validate(config, environment) {
    if (!environment.objectIds.includes(config.content.target_id)) throw new Error('Unknown TOUCH target')
    const success = config.success_condition
    if (!success || success.metric !== 'target_touched' || success.op !== 'eq' || success.value !== true) throw new Error('TOUCH requires target_touched == true')
    if (config.fail_condition != null) throw new Error('TOUCH supports time_limit failure only')
  },
  create(config, context) {
    const life = createMechanicLifecycle(config, context, {target_touched: false})
    return {
      start: life.start, reset: life.reset, dispose: life.dispose, getSnapshot: life.getSnapshot,
      handle(event) {
        if (!life.isActive() || event.type !== 'input.target_touched') return
        const {target_id, interaction_id} = event.payload
        if (target_id !== config.content.target_id || typeof interaction_id !== 'string' || !interaction_id.trim()) return
        life.update({target_touched: true}, {current: 1, total: 1})
        context.emit('mechanic.feedback', {type: 'activated', target_id, interaction_id})
        life.succeed()
      },
    }
  },
}
