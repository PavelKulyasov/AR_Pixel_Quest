const state = value => ({type: 'state', value})
const show = target => ({type: 'show', target})
const effect = (target, effect, duration_ms = 0) => ({type: 'effect', target, effect, duration_ms})
const say = (id, duration_ms) => ({type: 'dialogue', id, duration_ms})
const sound = (category, cue) => ({type: 'sound', category, cue})
export const introduction = [
  state('NULL_INTRO'), show('terminal'), show('null'), show('red_button'),
  sound('UI', 'granted'), effect('null', 'appear', 700),
  say('hello', 3200), say('warning', 2800), say('red', 3000),
  state('WAITING_RED_BUTTON'), effect('red_button', 'pulse'),
]
export const accident = [
  state('ACCIDENT'), sound('UI', 'notification'), effect('red_button', 'glitch'),
  effect('terminal', 'glitch'), sound('STORY', 'danger'),
  say('seriously', 2500), say('told', 4500),
  show('portal'), sound('GAMEPLAY', 'attention'), effect('portal', 'appear', 700),
  say('oops', 1800), say('worse', 2500), effect('null', 'vanish', 1100),
  {type: 'hide', target: 'null'}, state('NULL_LOST'),
]

export const searchIntroduction = [
  state('NULL_LOST'), show('terminal'), show('portal'),
  say('still_here', 4200), say('not_whole', 3200),
  show('null_head'), effect('null_head', 'pulse'), state('SEARCHING_NULL'),
]
export const searchFound = [
  state('NULL_FOUND'), sound('UI', 'granted'),
  say('found', 1800), say('rest', 3500),
]

export const collectIntroduction = [
  state('NULL_FOUND'), show('terminal'), show('portal'), show('null_head'),
  say('parts_scattered', 3500), say('usually', 2800),
  say('problem', 3500), say('no_hands', 2200), state('COLLECTING_PARTS'),
]
export const collectSuccess = [
  state('ASSEMBLING_NULL'), {type: 'hide', target: 'null_head'},
  show('null_assembled'), effect('null_assembled', 'appear', 1000),
  state('NULL_ASSEMBLED'), sound('UI', 'granted'),
  say('assembled', 1500), say('hands', 1500), say('happy_hands', 4000),
]

export const chooseIntroduction = [
  state('NULL_ASSEMBLED'), show('terminal'), show('portal'), show('null_assembled'),
  say('core_bad', 1800), say('core_need', 3000), say('core_fakes', 2400),
  say('core_rule', 4000), state('CHOOSING_CORE'),
]
export const chooseSuccess = [
  state('CORE_FOUND'), sound('UI', 'granted'),
  say('core_yes', 1500), say('core_genius', 3500),
]

export const sequenceIntroduction = [
  state('CORE_FOUND'), show('terminal'), show('portal'), show('null_assembled'),
  say('sequence_intro', 3200), say('sequence_remember', 1800), state('SEQUENCE_ACTIVE'),
]
export const sequenceSuccess = [
  state('SEQUENCE_SOLVED'), sound('UI', 'granted'),
  say('sequence_yes', 1600), say('sequence_suspicion', 4400), state('PORTAL_CLOSING'),
]
