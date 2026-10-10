import {createMechanicLifecycle} from '../../core/mechanic-lifecycle'

export const discoverMechanic = {
  mechanic_id: 'AR-02', mechanic: 'DISCOVER', api_version: 1, requires: ['targetVisibility'],
  validate(config, environment) {
    if (!environment.objectIds.includes(config.content.target_id)) throw new Error('Unknown DISCOVER target')
    const {hold_ms = 500, search_radius = 0.35} = config.parameters
    if (!Number.isFinite(hold_ms) || hold_ms <= 0) throw new Error('Invalid hold_ms')
    if (!Number.isFinite(search_radius) || search_radius <= 0 || search_radius > 1) throw new Error('Invalid search_radius')
    const success = config.success_condition
    if (!success || success.metric !== 'target_found' || success.op !== 'eq' || success.value !== true) throw new Error('DISCOVER requires target_found == true')
    if (config.fail_condition != null) throw new Error('DISCOVER supports time_limit failure only')
  },
  create(config, context) {
    const lifecycle = createMechanicLifecycle(config, context, {target_found: false})
    return {
      start: lifecycle.start, reset: lifecycle.reset, dispose: lifecycle.dispose, getSnapshot: lifecycle.getSnapshot,
      handle(event) {
        if (!lifecycle.isActive() || event.type !== 'ar.target_found' || event.payload.target_id !== config.content.target_id) return
        if (!Number.isFinite(event.payload.observed_ms) || event.payload.observed_ms < (config.parameters.hold_ms ?? 500)) return
        lifecycle.update({target_found: true}, {current: 1, total: 1})
        lifecycle.succeed()
      },
    }
  },
}
