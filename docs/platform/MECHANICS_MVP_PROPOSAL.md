# Архитектура MVP-механик — согласована 2026-09-27

Статус: архитектура и правила MVP явно согласованы владельцем 2026-09-27. Реализованы общие службы, AR-01 SCAN, AR-02 DISCOVER, AR-03 TOUCH, AR-05 COLLECT, AR-06 CHOOSE и AR-07 SEQUENCE. Идентификаторы и порядок приоритетов приняты из [стандарта владельца](MECHANICS_CATALOG.md). Внедрение остаётся последовательным; это не указание реализовать все 20 механик сразу. Фактический API и ограничения первого этапа: [MECHANICS_RUNTIME.md](MECHANICS_RUNTIME.md).

## Результат анализа текущего кода

Переиспользуем platform/ar/marker-manager.js (распознавание и копии pose), platform/ar/ar-object-manager.js (создание, уточнение привязки и сохранение после потери маркера), platform/ui/quest-ui.js и quest-ui.css, platform/modules/audio/pixel-audio.js, platform/modules/analytics/analytics.js, а также game config/audio-cues.js.

platform/core/episode-runtime.js синхронизирует видимость через state.markers[id] со статусами FOUND/COMPLETED, а platform/core/game-state.js открывает только первый маркер. Это подходит первому эпизоду, но ограничивает DISCOVER и COLLECT: объекту механики не обязательно нужен отдельный физический маркер. Поэтому старый runtime и контроллер episode-01 оставляем рабочими; новый исполнитель сценариев подключаем отдельным адаптером только к «AR Инициации».

На момент исходного анализа не было hit-test взаимодействия для объектов механик, определения обнаружения камерой, общего event bus, реестра механик, runner и отделённой от DOM презентации SEQUENCE. Демо tap-place реагирует на землю и не заменяет TOUCH. Обработка YES/NO в первом эпизоде не означает, что общий CHOOSE уже реализован.

## Разделение ответственности

```text
8th Wall / A-Frame → адаптеры входа → события → активная механика
                                              ↓ progress / result
Сценарий (content, parameters, conditions, next) → runner
                                              ↓ команды представления
                                       AR-объекты / UI / звук
```

Механика — независимая от THREE, DOM и сюжета логика. Адаптеры измеряют видимость и пересечения; UI отображает прогресс, ошибки и подсказки; assets принадлежат игре. Только runner выбирает следующий шаг. Состояние доступности контента отделяется от видимости маркера и результата механики.

Доступные общие службы (bus, clock, presentation) передаются через context. Фабрики механик подключаются явным статическим реестром. Для MVP не нужен загрузчик удалённых плагинов или универсальный менеджер всех сервисов. Звук и аналитика продолжают подключаться существующими фабриками; обе службы наблюдают события, но не принимают решения об успехе.

## Идентичность и конфигурация

- mechanic_id — стабильный тип AR-01 … AR-20, например AR-05.
- mechanic — каноническое имя COLLECT; реестр проверяет соответствие ID ↔ имя.
- step_id — уникальный экземпляр в сценарии, например collect_reactor_cells. Два шага COLLECT имеют одинаковый mechanic_id и разные step_id.
- game_id, episode_id, session_id, run_id — область выполнения. run_id меняется при повторе шага и защищает от поздних событий старого запуска.

Пример предлагаемого формата, не исполняемый файл:

```json
{
  "step_id": "collect_reactor_cells",
  "mechanic_id": "AR-05",
  "mechanic": "COLLECT",
  "content": {"object_set": "energy_cells", "target_ids": ["cell_a", "cell_b", "cell_c", "cell_d"]},
  "parameters": {"target_count": 4, "collection_order": "any", "time_limit": null},
  "success_condition": {"metric": "collected_count", "op": "eq", "value": 4},
  "fail_condition": null,
  "hints": [{"after_ms": 15000, "content_id": "look_around"}],
  "next": {"success": "unlock_portal", "fail": null}
}
```

Единицы времени всех конфигурационных интервалов — миллисекунды; null означает отсутствие ограничения. Это предлагаемая конкретизация параметров, а не переименование механик. Поля вроде target_sequence, target_ids и порогов DISCOVER добавляются в схемы как необходимые уточнения исходного каталога.

success_condition — проверяемое описание, не JavaScript-строка и не eval. У каждого типа есть допустимые метрики, операции и базовый предикат из каталога; конфигурация не может объявить успех обходом правил механики. Реестр отклоняет неизвестные ID, несовпадающие имена, повторные step_id, неизвестные цели/next, недостижимое target_count и некорректные ограничения до запуска. Ссылки переходов проверяются; бесконечные автоматические циклы запрещаются. Ветвление fail допускается, но автоматический бесконечный restart — нет.

## Реестр и жизненный цикл

Описание зарегистрированной механики: {mechanic_id, mechanic, api_version: 1, requires, validate, create}. requires перечисляет возможности адаптеров (markerInput, objectTouch, targetVisibility), а не сюжетные модули. Неизвестная/не реализованная механика приводит к понятной ошибке конфигурации, не к пустой успешной заглушке.

Фабрика create(config, context) возвращает start(), handle(event), getSnapshot(), reset(), dispose(). INIT включает валидацию и подготовку; READY означает готовность контента/адаптеров; вызов start() публикует START и переводит в ACTIVE. SUCCESS или FAIL фиксируется один раз. После результата runner публикует COMPLETE с outcome; NEXT — событие перехода runner, а не решение самой механики. Терминальная SUCCESS не превращается в FAIL от запоздалого таймера.

Общий lifecycle helper владеет статусом, progress, таймерами, подсказками и защитой от повторного результата. Механика определяет правила ввода и прогресс. callback завершения вызывается ровно один раз на run_id; callback и событие COMPLETE не должны независимо запускать два перехода.

reset очищает данные попытки и возвращает READY; restart выполняется runner как reset + новый run_id + start. dispose отменяет таймеры, подписки и отложенные эффекты без успеха/перехода. При скрытии страницы игровой clock приостанавливается, ввод блокируется; показ SEQUENCE при возврате начинается заново без штрафа. Отсутствие звука не блокирует READY: доступно визуальное представление.

MVP исполняет один активный шаг. Контракт допускает будущую композицию, но параллельные задания и кооперация сейчас не реализуются. Снимок состоит из сериализуемых данных, без DOM/THREE. localStorage и миграции сохранений — отдельный этап; формат снимка сейчас не обещает восстановление AR-позы между сеансами.

## Общие события

Конверт: {event_id, type, game_id, episode_id, session_id, step_id, run_id, source, payload}. Clock монотонный и внедряемый для тестов; время журнала/аналитики не используется для таймаутов. Все события — JSON-совместимые данные, без объектов сцены.

| Событие | Откуда / данные | Назначение |
| --- | --- | --- |
| ar.marker_detected | AR-адаптер: marker_id | Ввод SCAN |
| ar.target_found | адаптер видимости: target_id, observed_ms | Ввод DISCOVER после проверки видимости |
| input.target_touched | адаптер нажатия: target_id, interaction_id | TOUCH, COLLECT, CHOOSE, SEQUENCE |
| presentation.sequence_finished | представление: token, run_id | Разрешить ввод SEQUENCE после показа |
| mechanic.started / mechanic.progress | lifecycle: mechanic_id, progress | UI и аналитика |
| mechanic.feedback / mechanic.hint | механика/lifecycle: тип, content_id | Подсветка, звук, подсказка |
| mechanic.completed | lifecycle: outcome, reason, snapshot | Единственный результат для runner |
| scenario.step_changed / scenario.completed | runner | Переходы сценария |

События входа от сцены получают текущие step_id/run_id при маршрутизации. Неактивные, скрытые, заблокированные и чужие target_id отбрасываются. Одна шина на сеанс, без глобального singleton. Подписка возвращает unsubscribe. Очередь FIFO предотвращает рекурсивный переход внутри dispatch; исключение критического обработчика завершает шаг ошибкой и очисткой, исключение аналитики не прерывает игру.

event_id и interaction_id защищают от дублирования click/touch; COLLECT дополнительно хранит множество собранных target_id. Для SEQUENCE дедупликация по target_id запрещена: повтор одного цвета может быть частью правильного образца. Удалённые слушатели не получают оставшиеся события; run_id отсекает старые таймеры и подтверждения представления.

## Поведение шести MVP-механик

| Механика | Вход и успех | Минимальные правила / проверка |
| --- | --- | --- |
| AR-01 SCAN | Назначенный marker_id распознан → marker_detected | Повторный кадр не завершает шаг повторно; уже видимый маркер при START учитывается, если разрешён сценарием |
| AR-02 DISCOVER | Адаптер подтвердил target_found | Предлагается центр видимого, доступного объекта в зоне поиска камеры непрерывно 500 мс. Это настраиваемый порог; потеря видимости сбрасывает накопление. Проверка перекрытия виртуальными объектами через raycast; реальные препятствия без глубины не распознаются |
| AR-03 TOUCH | Пересечение луча нажатия с доступным target_id → target_touched | Попадание в дочерний mesh переводится в id родительского объекта; обратная связь в том же взаимодействии, один результат |
| AR-05 COLLECT | Уникальное допустимое нажатие добавляет объект; collected_count == target_count | Счётчик N / target_count; порядок any или явный список, неверный порядок даёт feedback без прогресса; collected повторно не считается. Полный инвентарь пока не требуется |
| AR-06 CHOOSE | selected_object == correct_target | Только цели шага; неверный выбор увеличивает attempts, правильный завершает. null attempt_limit — без лимита. Для MVP error_penalty предлагается none или reset_progress, без выдуманных штрафных очков |
| AR-07 SEQUENCE | player_sequence == target_sequence | Сначала фаза показа, затем ввода. Нажатия во время показа игнорируются. Ошибка очищает ввод и повторяет показ; лимит считается по ошибочным попыткам. target_sequence задан явно и согласован с sequence_length/available_elements |

Предлагаемые общие значения для onboarding: difficulty=INTRO, без таймера поражения, неограниченные попытки, визуальная помощь; ошибки обучения не закрывают сценарий. Каталожная сложность CHOOSE/SEQUENCE остаётся 2, а облегчённый режим конкретного onboarding — параметр сценария. Порог 500 мс, штрафы и поведение ошибки SEQUENCE согласованы вместе с архитектурой.

DISCOVER использует видимость в виртуальной сцене, не пытается выдавать обнаружение за ANALYZE или распознавание реального предмета. COLLECT не переименовывается в отдельные collect_magic_crystals. Представление SEQUENCE умеет подсветить объекты и подтвердить окончание; недоступный звук не мешает прохождению.

## Файлы для реализации после согласования

Новые общие файлы:

- platform/core/event-bus.js — очередь событий и подписки.
- platform/core/game-clock.js — таймеры активного времени и пауза.
- platform/core/mechanic-registry.js — ID/имя, возможности, фабрики и валидация.
- platform/core/mechanic-lifecycle.js — общий цикл, попытка, подсказки, timeout и очистка.
- platform/core/scenario-runner.js — исполнение шагов, результат и переход.
- platform/ar/mechanic-episode-component.js — подключение нового runner к A-Frame, отдельно от первого эпизода.
- platform/ar/interaction-adapter.js — нажатия с raycast и фильтрацией UI/целей.
- platform/ar/discovery-adapter.js — наблюдение цели камерой и накопление времени.
- platform/ui/mechanic-presenter.js — представление прогресса, ошибок, подсказок и показа SEQUENCE.
- platform/modules/mechanics/catalog.js — 20 канонических ID/имён и их метаданные, без фиктивных реализаций.
- platform/modules/mechanics/scan.js — AR-01 SCAN.
- platform/modules/mechanics/discover.js — AR-02 DISCOVER.
- platform/modules/mechanics/touch.js — AR-03 TOUCH.
- platform/modules/mechanics/collect.js — AR-05 COLLECT.
- platform/modules/mechanics/choose.js — AR-06 CHOOSE.
- platform/modules/mechanics/sequence.js — AR-07 SEQUENCE.

Новые файлы игры:

- games/pixel-quest/episodes/ar-initiation/scenario.js — шаги MECHANIC + CONTENT + PARAMETERS + SUCCESS CONDITION + NEXT STEP.
- games/pixel-quest/episodes/ar-initiation/content.js — объектные наборы, подсказки и оформление.
- games/pixel-quest/episodes/ar-initiation/component.js — композиция адаптеров и runner.
- games/pixel-quest/docs/episodes/ar-initiation/SCENARIO.md — согласованный onboarding.
- games/pixel-quest/docs/episodes/ar-initiation/ACCEPTANCE_CRITERIA.md — ожидаемые результаты и проверки на телефоне.

Изменяемые существующие файлы:

- platform/ar/ar-object-manager.js — доступ к объектам по id, метки интерактивности, hide/remove для собранного, обратная связь; сохранить существующие методы и правила трекинга.
- platform/ui/quest-ui.js и platform/ui/quest-ui.css — необязательный прогресс/подсказки через совместимое расширение представления.
- games/pixel-quest/config/game.js — явный реестр только реализованных механик и режим запуска.
- games/pixel-quest/app.js — отдельный выбор onboarding без смены поведения episode-01 по умолчанию; предлагается ?episode=ar-initiation.
- docs/platform/ARCHITECTURE.md, docs/platform/MODULES.md, docs/platform/READINESS.md и docs/guides/CREATE_GAME.md — описание реально реализованных контрактов по мере готовности.
- CHANGELOG.md — запись каждого законченного этапа с точными путями.

Существующие platform/core/episode-runtime.js, platform/core/game-state.js, platform/ar/marker-manager.js, platform/ar/episode-component.js, platform/ar/register-game.js и games/pixel-quest/episodes/episode-01/controller.js предполагается переиспользовать без переписывания. Новые адаптеры оборачивают callbacks marker-manager; переходы старого эпизода сохраняются. Изменение этих файлов допускается только при выявленной необходимости, с отдельной проверкой совместимости.

Новые проверки: tests/event-bus.test.cjs, tests/game-clock.test.cjs, tests/mechanic-registry.test.cjs, tests/mechanic-lifecycle.test.cjs, tests/scenario-runner.test.cjs, tests/scan.test.cjs, tests/discover.test.cjs, tests/touch.test.cjs, tests/collect.test.cjs, tests/choose.test.cjs, tests/sequence.test.cjs, tests/mechanics-browser-smoke.cjs. Они добавляются вместе со своей функциональностью, не все заранее. tests/browser-smoke.cjs и tests/episode-01.test.cjs сохраняют регрессионные проверки.

## Порядок внедрения и приёмки

1. Согласовать этот документ. Только затем event bus, registry, clock, lifecycle и минимальный runner, проверяемые на одном SCAN. Не строить все будущие службы до первого рабочего шага.
2. AR-01 SCAN: один маркер, один результат; потеря/повтор не сбрасывает сцену и не дублирует переход.
3. AR-02 DISCOVER: тест виртуальной видимости и физическая проверка поиска камерой.
4. AR-03 TOUCH: попадание по объекту, отклик, защита от нажатия через HTML-панель.
5. AR-05 COLLECT: один и тот же модуль на двух наборах контента; четыре уникальные цели, счётчик и защита от дублей.
6. AR-06 CHOOSE: правильные/ошибочные варианты, лимит и повтор.
7. AR-07 SEQUENCE: показ, запрет раннего ввода, порядок, повтор цвета, ошибка/повтор и отмена при скрытии страницы.
8. Полная «AR Инициация»: пройти шесть шагов на Android и iPhone. Проверить reset, таймауты, поздние события, dispose, изоляцию экземпляров и неизменность episode-01.

Отдельно позже: сохраняемый инвентарь, localStorage, параллельные задания, карта маркеров и сервер. SYNC/ROLE требуют сетевой модели, а BOSS — композиции фаз уже проверенных механик, не отдельного монолита.

## Согласованные решения

Владелец утвердил: отдельный onboarding; один активный шаг в MVP; фабрики в статическом реестре; предложенный жизненный цикл/события; критерий DISCOVER 500 мс; правила ошибок CHOOSE/SEQUENCE; INTRO без обязательного поражения. Окончательные тексты и визуальные ресурсы onboarding можно согласовать при подключении каждой механики. Физические проверки потребуют устройства пользователя; технические модули и тесты реализует агент.
