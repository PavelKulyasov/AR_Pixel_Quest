// Canonical dialogue: games/pixel-quest/docs/episodes/episode-01/DIALOGUES.md.
// Log/file labels and navigation are minimal prototype copy derived from SCENARIO.md.
export const episode = {
  id: 1,
  targets: {
    '20_Element_Fire': 'MARKER_01',
    '22_Element_Air': 'MARKER_02',
    '23_Element_Water': 'MARKER_03',
  },
  objects: {
    MARKER_01: {id: 'anomaly_character', model: '#anomalyModel', color: '#7fffea'},
    MARKER_02: {id: 'system_terminal', color: '#57c9ff'},
    MARKER_03: {id: 'character_file', color: '#c48bff'},
  },
  intrusion: [
    'SYSTEM:\nДоступ запрещён.',
    'UNKNOWN USER:\nДоступ разрешён.',
    'SYSTEM:\nКто вы?',
    'UNKNOWN USER:\n...',
    'UNKNOWN USER:\nВы задаёте неправильный вопрос.',
  ],
}
const next = {id: 'NEXT', label: 'Далее'}
export function getView(state) {
  const answer = [{id: 'YES', label: 'ДА'}, {id: 'NO', label: 'НЕТ'}]
  switch (state.step) {
    case 'SEARCH_CHARACTER':
      return {systemCue: 'attention', task: 'Найдите источник сигнала.', system: 'Инициализация системы.\nСигнал обнаружен.'}
    case 'WAITING_CHARACTER_ANSWER':
      return {systemCue: 'attention',
        task: 'Ответьте персонажу.',
        character: state.lastAnswer === 'NO'
          ? 'Тогда почему вы смотрите прямо на меня?\n\nВы меня видите?' : 'Вы меня видите?',
        system: state.lastAnswer === 'NO' ? 'Ответ противоречит данным камеры.\n\nПопробуйте ещё раз.' : '',
        actions: answer,
      }
    case 'CHARACTER_CONFIRMED':
      return {systemCue: 'error',
        system: 'Ответ получен.\n\nОшибка.\n\nИгрок не должен иметь возможности\nотвечать этому объекту.',
        character: 'Интересно...\n\nЗначит, вы действительно меня видите.',
        actions: [next],
      }
    case 'MARKER_02_UNLOCKED':
      return {task: 'Найдите системный терминал.'}
    case 'LOG_ACTIVE':
      return {systemCue: 'notification',
        task: 'Изучите системный журнал.',
        system: 'СИСТЕМНЫЙ ЖУРНАЛ\n\nОбъект: неизвестный персонаж.\nПопытка удаления.\nУдаление не выполнено.\nОбъект снова активен.\nУровень доступа: администратор.',
        actions: [{id: 'CONFIRM_LOG', label: 'Журнал прочитан'}],
      }
    case 'LOG_CONFIRMED':
      return {character: 'Вы пытаетесь понять, кто меня создал?\n\nЯ тоже хочу это знать.', actions: [next]}
    case 'MARKER_03_UNLOCKED':
      return {task: 'Найдите файл персонажа.'}
    case 'FILE_ACTIVE':
      return {systemCue: 'error',
        task: 'Изучите повреждённый файл.',
        system: 'ФАЙЛ ПЕРСОНАЖА\n\nФайл повреждён.\nИдентификатор: неизвестен.\nРегистрация: отсутствует.\nСоздатель: неизвестен.',
        actions: [{id: 'CONFIRM_FILE', label: 'Файл прочитан'}],
      }
    case 'FILE_CONFIRMED':
      return {systemCue: 'error', system: 'Файл повреждён.', actions: [next]}
    case 'SYSTEM_INTRUSION':
      return state.intrusionIndex < episode.intrusion.length
        ? {system: episode.intrusion[state.intrusionIndex], systemCue: ['denied', 'granted', 'danger', 'notification', 'attention'][state.intrusionIndex], actions: [next]}
        : {character: 'До следующей встречи.', actions: [next]}
    case 'EPISODE_COMPLETE':
      return {systemCue: 'complete', task: 'Эпизод завершён.', system: 'Первый сбой'}
    default: return {}
  }
}
