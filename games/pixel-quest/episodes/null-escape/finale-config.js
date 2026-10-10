const state = value => ({type: 'state', value})
const show = target => ({type: 'show', target})
const hide = target => ({type: 'hide', target})
const say = (id, duration_ms) => ({type: 'dialogue', id, duration_ms})
const sound = cue => ({type: 'sound', category: 'STORY', cue})
export const finaleTimeline = [
  state('PORTAL_CLOSING'), show('terminal'), show('portal'), show('null_assembled'), show('terminal_display'),
  say('finale_look', 4000),
  say('stability_82', 900), say('stability_91', 900), say('stability_97', 900), say('stability_99', 1800),
  say('strange', 1800), say('why_99', 2200),
  state('ANOMALY_EVENT'), sound('anomaly'), say('anomaly_glitch', 150),
  show('anomaly_silhouette'), {type: 'wait', duration_ms: 450}, hide('anomaly_silhouette'),
  say('did_you_see', 2800), say('thanks_access', 2500), say('not_me', 2400), say('see_you', 1500),
  hide('portal'), sound('portal_close'), state('ENDING'), {type: 'wait', duration_ms: 1200},
  say('ending_so', 1300), say('ending_deal', 2400), say('ending_button', 3500),
  {type: 'wait', duration_ms: 800}, say('ending_investigate', 3000),
  say('training_complete', 1500), sound('anomaly'), say('connection_established', 650),
  say('training_complete', 1200), say('ending_uneasy', 3500), state('COMPLETED'),
]
export const finaleDuration = finaleTimeline.reduce((sum, command) => sum + (command.duration_ms || 0), 0)
export const finaleDialogues = {
  finale_look: {task: 'Посмотри на портал и терминал рядом с карточкой огня.'},
  stability_82: {task: 'СТАБИЛЬНОСТЬ: 82%', terminalText: '82%'},
  stability_91: {task: 'СТАБИЛЬНОСТЬ: 91%', terminalText: '91%'},
  stability_97: {task: 'СТАБИЛЬНОСТЬ: 97%', terminalText: '97%'},
  stability_99: {task: 'СТАБИЛЬНОСТЬ: 99%', terminalText: '99%'},
  strange: {task: 'СТАБИЛЬНОСТЬ: 99%', character: 'Странно.'},
  why_99: {task: 'СТАБИЛЬНОСТЬ: 99%', character: 'Почему 99?'},
  anomaly_glitch: {task: 'СТАБИЛЬНОСТЬ: 99%', screenGlitch: true},
  did_you_see: {character: 'Ты это видел?'},
  thanks_access: {system: 'СПАСИБО ЗА ДОСТУП', terminalText: ['СПАСИБО ЗА', 'ДОСТУП'].join(String.fromCharCode(10))},
  not_me: {character: 'Это написал не я.'},
  see_you: {system: 'УВИДИМСЯ.', terminalText: 'УВИДИМСЯ.'},
  ending_so: {character: 'Так.'},
  ending_deal: {character: 'Предлагаю договориться.'},
  ending_button: {character: 'Про красную кнопку никому не рассказываем.'},
  ending_investigate: {character: 'А вот про это надо разобраться.'},
  training_complete: {task: 'ОБУЧЕНИЕ ЗАВЕРШЕНО'},
  connection_established: {task: 'СВЯЗЬ УСТАНОВЛЕНА', screenGlitch: true},
  ending_uneasy: {task: 'ОБУЧЕНИЕ ЗАВЕРШЕНО', character: '…Мне это совсем не нравится.'},
}
