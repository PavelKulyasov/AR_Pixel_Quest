// Approved onboarding: SCAN, DISCOVER, TOUCH, COLLECT, CHOOSE, SEQUENCE.
export const initiationScenario = {
  id: 'ar-initiation',
  first_step: 'activate_training_terminal',
  steps: [{
    step_id: 'activate_training_terminal', mechanic_id: 'AR-01', mechanic: 'SCAN', difficulty: 1,
    content: {marker_id: 'INITIATION_MARKER', object_ids: ['training_terminal', 'training_beacon']},
    parameters: {accept_existing: true, time_limit: null},
    success_condition: {metric: 'marker_detected', op: 'eq', value: true},
    fail_condition: null,
    hints: [{after_ms: 15000, content_id: 'find_fire_card'}],
    advance: 'manual',
    next: {success: 'find_training_beacon', fail: null},
  }, {
    step_id: 'find_training_beacon', mechanic_id: 'AR-02', mechanic: 'DISCOVER', difficulty: 1,
    content: {target_id: 'training_beacon'},
    parameters: {hold_ms: 500, search_radius: 0.35, time_limit: null},
    success_condition: {metric: 'target_found', op: 'eq', value: true}, fail_condition: null,
    hints: [{after_ms: 15000, content_id: 'find_beacon'}], advance: 'manual',
    next: {success: 'activate_training_beacon', fail: null},
  }, {
    step_id: 'activate_training_beacon', mechanic_id: 'AR-03', mechanic: 'TOUCH', difficulty: 1,
    content: {target_id: 'training_beacon'}, parameters: {time_limit: null},
    success_condition: {metric: 'target_touched', op: 'eq', value: true}, fail_condition: null,
    hints: [{after_ms: 15000, content_id: 'touch_beacon'}], advance: 'manual',
    next: {success: 'collect_training_cells', fail: null},
  }, {
    step_id: 'collect_training_cells', mechanic_id: 'AR-05', mechanic: 'COLLECT', difficulty: 1,
    content: {object_set: 'training_cells', target_ids: ['cell_1', 'cell_2', 'cell_3', 'cell_4']},
    parameters: {target_count: 4, collection_order: 'any', time_limit: null},
    success_condition: {metric: 'collected_count', op: 'eq', value: 4}, fail_condition: null,
    hints: [{after_ms: 15000, content_id: 'collect_cells'}], advance: 'manual',
    next: {success: 'choose_training_channel', fail: null},
  }, {
    step_id: 'choose_training_channel', mechanic_id: 'AR-06', mechanic: 'CHOOSE', difficulty: 1,
    content: {target_ids: ['channel_left', 'channel_center', 'channel_right']},
    parameters: {correct_target: 'channel_center', false_targets: ['channel_left', 'channel_right'], attempt_limit: null, error_penalty: 'none', time_limit: null},
    success_condition: {metric: 'selected_object', op: 'eq', value: 'channel_center'}, fail_condition: null,
    hints: [{after_ms: 15000, content_id: 'choose_channel'}], advance: 'manual',
    next: {success: 'repeat_training_sequence', fail: null},
  }, {
    step_id: 'repeat_training_sequence', mechanic_id: 'AR-07', mechanic: 'SEQUENCE', difficulty: 1,
    content: {target_ids: ['channel_left', 'channel_center', 'channel_right']},
    parameters: {available_elements: ['channel_left', 'channel_center', 'channel_right'], target_sequence: ['channel_center', 'channel_left', 'channel_center', 'channel_right'], sequence_length: 4, display_speed: 800, gap_ms: 300, attempt_limit: null, time_limit: null},
    success_condition: {metric: 'player_sequence', op: 'eq', value: ['channel_center', 'channel_left', 'channel_center', 'channel_right']}, fail_condition: null,
    hints: [], advance: 'manual',
    next: {success: null, fail: null},
  }],
}
