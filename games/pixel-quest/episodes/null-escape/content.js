import {dialogues} from './dialogues'
import {partsChecklist} from './collect-config'
import {objects} from './objects'
const view = {start: {}, success: {}, fail: {}}
export const nullEscapeContent = {
  targets: {'20_Element_Fire': 'START_MARKER'}, objects,
  hints: {sequence_help: 'Дождись конца подсветки и нажми символы в том же порядке. Если забыл, нажми «Показать ещё раз».', choose_rule: 'Настоящий куб пульсирует два раза подряд, затем делает паузу.', choose_watch: 'Посмотри на каждый куб несколько секунд. Ищи ритм: раз, два — длинная пауза. Нажми на этот куб.', collect_help: 'Двигатель и руки разлетелись в разные стороны. Осмотрись и нажми на каждую деталь на экране.', collect_highlight: 'Оставшиеся детали подсвечены. Осмотрись и нажми на них на экране.', search_listen: 'Нулика где-то рядом. Медленно осмотрись камерой.', search_direction: 'Следуй указателю и помести голову Нулика в рамку.', search_highlight: 'Ищи светящуюся голову. Удерживай её в рамке полсекунды; нажимать не нужно.', scan: 'Найди карточку с огнём и помести её целиком в кадр.', button: 'Ты ведь не собираешься её нажимать?..'},
  intro: {task: 'Побег Нулика', system: 'Найди карточку с огнём. Здесь начинается приключение.', showText: true, actions: [{id: 'START', label: 'Начать'}]},
  steps: {portal_finale: {...view, start: {task: 'ЗАКРЫТИЕ ПОРТАЛА'}}, portal_sequence: {...view,
    start: {task: 'ЗАПОМНИ ПОСЛЕДОВАТЕЛЬНОСТЬ', system: 'Смотри на подсветку символов. Пока показ не закончится, нажимать не нужно.'},
    input: {task: 'ПОВТОРИ ПОСЛЕДОВАТЕЛЬНОСТЬ', system: 'Нажимай символы в показанном порядке.'},
    wrongSequence: {task: 'ПОСМОТРИ ЕЩЁ РАЗ', ...dialogues.sequence_wrong},
    replayLabel: 'Показать ещё раз'}, choose_core: {...view, start: {task: 'НАЙДИ НАСТОЯЩИЙ ЭНЕРГОКУБ', system: 'Сравни ритмы: два коротких импульса — длинная пауза. Нажми на подходящий куб.'}}, collect_parts: {...view, start: {task: 'СОБЕРИ ДЕТАЛИ НУЛИКА', system: partsChecklist() + '\nДетали рядом с головой. Осмотрись и нажми на каждую.'}}, scan_terminal: {...view, start: {task: 'Наведи камеру на карточку с огнём.'}}, red_button: view, discover_null: {...view, start: {task: 'НАЙДИ НУЛИКА', system: 'Осмотрись камерой. Найди голову и удерживай её в центральной рамке полсекунды. Нажимать не нужно.'}}},
  complete: {task: 'ОБУЧЕНИЕ ЗАВЕРШЕНО', showText: true, actions: [{id: 'RETRY', label: 'Повторить сцену'}, {id: 'RESTART', label: 'Сначала'}]},
  error: {task: 'Не удалось запустить сцену.', system: 'Обнови страницу и попробуй снова.', showText: true},
}
