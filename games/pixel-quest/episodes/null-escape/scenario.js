import {finaleTimeline} from './finale-config'
import {sequenceConfig, symbolIds} from './sequence-config'
import {chooseConfig, coreIds} from './choose-config'
import {collectConfig, partIds} from './collect-config'
import {introduction, accident, searchIntroduction, searchFound, collectIntroduction, collectSuccess, chooseIntroduction, chooseSuccess, sequenceIntroduction, sequenceSuccess} from './presentations'
import {searchConfig} from './search-config'
export const nullEscapeScenario = {
  id: 'null-escape', first_step: 'scan_terminal',
  steps: [{
    step_id: 'scan_terminal', mechanic_id: 'AR-01', mechanic: 'SCAN', difficulty: 1,
    scenario_state: 'WAITING_START_MARKER',
    content: {marker_id: 'START_MARKER', object_ids: []},
    parameters: {accept_existing: true, time_limit: null},
    success_condition: {metric: 'marker_detected', op: 'eq', value: true}, fail_condition: null,
    hints: [{after_ms: 15000, content_id: 'scan'}], advance: 'auto',
    next: {success: 'red_button', fail: null},
  }, {
    step_id: 'red_button', mechanic_id: 'AR-03', mechanic: 'TOUCH', difficulty: 1,
    scenario_state: 'NULL_INTRO', enter: introduction, exit: accident,
    content: {target_id: 'red_button'}, parameters: {time_limit: null},
    success_condition: {metric: 'target_touched', op: 'eq', value: true}, fail_condition: null,
    hints: [{after_ms: 15000, content_id: 'button'}], advance: 'auto',
    next: {success: 'discover_null', fail: null},
  }, {
    step_id: 'discover_null', mechanic_id: 'AR-02', mechanic: 'DISCOVER', difficulty: 1,
    scenario_state: 'NULL_LOST', enter: searchIntroduction, exit: searchFound,
    content: {target_id: searchConfig.target_id},
    parameters: {hold_ms: searchConfig.hold_ms, search_radius: searchConfig.search_radius, time_limit: null},
    success_condition: {metric: 'target_found', op: 'eq', value: true}, fail_condition: null,
    hints: searchConfig.hints, advance: 'auto', next: {success: 'collect_parts', fail: null},
  }, {
    step_id: 'collect_parts', mechanic_id: 'AR-05', mechanic: 'COLLECT', difficulty: 1,
    scenario_state: 'NULL_FOUND', enter: collectIntroduction, exit: collectSuccess,
    content: {object_set: 'null_parts', target_ids: partIds},
    parameters: {target_count: partIds.length, collection_order: 'any', time_limit: null},
    success_condition: {metric: 'collected_count', op: 'eq', value: partIds.length}, fail_condition: null,
    hints: collectConfig.hints, advance: 'auto', next: {success: 'choose_core', fail: null},
  }, {
    step_id: 'choose_core', mechanic_id: 'AR-06', mechanic: 'CHOOSE', difficulty: 1,
    scenario_state: 'NULL_ASSEMBLED', enter: chooseIntroduction, exit: chooseSuccess,
    content: {target_ids: coreIds},
    parameters: {correct_target: chooseConfig.correctCore, false_targets: coreIds.filter(id => id !== chooseConfig.correctCore), attempt_limit: null, error_penalty: 'none', time_limit: null},
    success_condition: {metric: 'selected_object', op: 'eq', value: chooseConfig.correctCore}, fail_condition: null,
    hints: chooseConfig.hints, advance: 'auto', next: {success: 'portal_sequence', fail: null},
  }, {
    step_id: 'portal_sequence', mechanic_id: 'AR-07', mechanic: 'SEQUENCE', difficulty: 1,
    scenario_state: 'CORE_FOUND', enter: sequenceIntroduction, exit: sequenceSuccess,
    content: {target_ids: symbolIds},
    parameters: {available_elements: symbolIds, target_sequence: sequenceConfig.sequence, sequence_length: sequenceConfig.sequence.length, display_speed: sequenceConfig.display_speed, gap_ms: sequenceConfig.gap_ms, attempt_limit: null, time_limit: null},
    success_condition: {metric: 'player_sequence', op: 'eq', value: sequenceConfig.sequence}, fail_condition: null,
    hints: sequenceConfig.hints, advance: 'auto', next: {success: 'portal_finale', fail: null},
  }, {
    step_id: 'portal_finale', kind: 'presentation', scenario_state: 'PORTAL_CLOSING',
    enter: finaleTimeline, exit: [], advance: 'auto', next: {success: null, fail: null},
  }],
}
