import {createMechanicLifecycle} from '../../core/mechanic-lifecycle'

export const scanMechanic = {
  mechanic_id: 'AR-01',
  mechanic: 'SCAN',
  api_version: 1,
  requires: ['markerInput'],
  validate(config, environment) {
    if (!environment.markerIds.includes(config.content.marker_id)) throw new Error('Unknown SCAN marker')
    if (config.content.object_ids != null && !Array.isArray(config.content.object_ids)) throw new Error('object_ids must be an array')
    for (const id of config.content.object_ids || []) {
      if (!environment.objectIds.includes(id)) throw new Error('Unknown SCAN object: ' + id)
    }
    if (config.parameters.accept_existing != null && typeof config.parameters.accept_existing !== 'boolean') throw new Error('accept_existing must be boolean')
    const success = config.success_condition
    if (!success || success.metric !== 'marker_detected' || success.op !== 'eq' || success.value !== true) throw new Error('SCAN success must require marker_detected == true')
    if (config.fail_condition != null) throw new Error('SCAN supports time_limit failure only')
  },
  create(config, context) {
    const lifecycle = createMechanicLifecycle(config, context, {marker_detected: false})
    return {
      start: lifecycle.start,
      getSnapshot: lifecycle.getSnapshot,
      reset: lifecycle.reset,
      dispose: lifecycle.dispose,
      handle(event) {
        if (!lifecycle.isActive() || event.type !== 'ar.marker_detected' || event.payload.marker_id !== config.content.marker_id) return
        if (event.source === 'snapshot' && config.parameters.accept_existing === false) return
        lifecycle.update({marker_detected: true}, {current: 1, total: 1})
        lifecycle.succeed()
      },
    }
  },
}
