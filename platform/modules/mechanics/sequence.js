import {createMechanicLifecycle} from '../../core/mechanic-lifecycle'

export const sequenceMechanic = {
  mechanic_id: 'AR-07', mechanic: 'SEQUENCE', api_version: 1, requires: ['objectTouch', 'sequencePresentation'],
  validate(config, environment) {
    const ids = config.content.target_ids
    const {target_sequence: sequence, available_elements: available, sequence_length: length, display_speed = 800, gap_ms = 300, attempt_limit} = config.parameters
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !environment.objectIds.includes(id))) throw new Error('Invalid SEQUENCE targets')
    if (!Array.isArray(available) || available.length !== ids.length || new Set(available).size !== ids.length || available.some(id => !ids.includes(id))) throw new Error('Invalid available_elements')
    if (!Array.isArray(sequence) || !sequence.length || sequence.some(id => !ids.includes(id)) || length !== sequence.length) throw new Error('Invalid target_sequence or sequence_length')
    if (!Number.isFinite(display_speed) || display_speed <= 0 || !Number.isFinite(gap_ms) || gap_ms <= 0) throw new Error('Invalid SEQUENCE timing')
    if (attempt_limit != null && (!Number.isInteger(attempt_limit) || attempt_limit < 1)) throw new Error('Invalid attempt_limit')
    const success = config.success_condition
    if (!success || success.metric !== 'player_sequence' || success.op !== 'eq' || JSON.stringify(success.value) !== JSON.stringify(sequence)) throw new Error('SEQUENCE requires player_sequence == target_sequence')
    if (config.fail_condition != null) throw new Error('SEQUENCE supports attempt_limit and time_limit failure only')
  },
  create(config, context) {
    const sequence = config.parameters.target_sequence
    const life = createMechanicLifecycle(config, context, {phase: 'SHOWING', player_sequence: [], attempts: 0, presentation_token: null})
    const seen = new Set()
    let player = [], attempts = 0, token = 0, phase = 'SHOWING'
    const report = () => life.update({phase, player_sequence: player, attempts, presentation_token: token}, {current: player.length, total: sequence.length})
    function show(reason) {
      if (!life.isActive()) return
      player = []; phase = 'SHOWING'; token += 1
      report()
      context.emit('mechanic.sequence_requested', {token, sequence, reason, display_speed: config.parameters.display_speed ?? 800, gap_ms: config.parameters.gap_ms ?? 300})
    }
    return {
      start() { if (life.start()) show('start') }, getSnapshot: life.getSnapshot,
      reset() { if (!life.reset()) return false; player = []; attempts = 0; phase = 'SHOWING'; seen.clear(); return true },
      dispose() { seen.clear(); life.dispose() },
      handle(event) {
        if (!life.isActive()) return
        if (event.type === 'presentation.sequence_replay') { show('replay'); return }
        if (event.type === 'presentation.sequence_finished') {
          if (phase !== 'SHOWING' || event.payload.token !== token) return
          phase = 'INPUT'; report(); context.emit('mechanic.sequence_ready', {token}); return
        }
        if (event.type !== 'input.target_touched') return
        const {target_id, interaction_id} = event.payload
        if (typeof interaction_id !== 'string' || !interaction_id.trim() || seen.has(interaction_id) || !config.content.target_ids.includes(target_id)) return
        seen.add(interaction_id)
        if (phase !== 'INPUT') return
        if (target_id !== sequence[player.length]) {
          attempts += 1; player = []; report()
          context.emit('mechanic.feedback', {type: 'wrong_sequence', target_id, attempts})
          if (config.parameters.attempt_limit != null && attempts >= config.parameters.attempt_limit) life.fail('attempt_limit')
          else show('error')
          return
        }
        player.push(target_id); report()
        context.emit('mechanic.feedback', {type: 'sequence_input', target_id})
        if (player.length === sequence.length) life.succeed()
      },
    }
  },
}
