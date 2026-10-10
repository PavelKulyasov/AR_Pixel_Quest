# Стандартная библиотека механик AR Pixel Quest

Источник: спецификация владельца проекта от 2026-09-25. ID и имена ниже — стандарт для дальнейшего кода, конфигураций и документации. Наличие в каталоге не означает наличие реализации. Предлагаемая архитектура MVP описана в MECHANICS_MVP_PROPOSAL.md и согласована 2026-09-27. Реализован AR-01 SCAN; остальные ID пока не имеют исполняемых модулей.

## Принцип

`MECHANIC + CONTENT + PARAMETERS + SUCCESS CONDITION + NEXT STEP`

Пример: `COLLECT + energy_crystals + count=4 + all_collected + unlock_portal`.

Cyber, Magic и Creatures — оболочки одного COLLECT, а не новые механики. В формальной конфигурации параметр количества COLLECT называется target_count. Идентификаторы содержимого (energy_cells, magic_crystals, creatures) не должны попадать в общую логику механики.

## Каталог

| Группа | mechanic_id | Стандартное имя / название | Сложность | Действие и условие успеха | Параметры из спецификации |
| --- | --- | --- | --- | --- | --- |
| LEVEL 1 | AR-01 | SCAN — Scan / Activate Marker | 1 | Навести камеру на физический маркер; marker_detected == true | Маркер и связанный контент задаются сценарием |
| LEVEL 1 | AR-02 | DISCOVER — Discover / Find Object | 1 | Найти объект камерой; target_found == true | Настройки помощи определяет сценарий |
| LEVEL 1 | AR-03 | TOUCH — Touch / Activate Object | 1 | Нажать AR-объект; target_touched == true | Действие задаётся сценарием |
| LEVEL 1 | AR-04 | CATCH — Catch Moving Object | 1 | Поймать движущиеся цели нажатием; targets_caught >= required_targets | movement_speed, movement_pattern, target_size, target_count, time_limit |
| LEVEL 1 | AR-05 | COLLECT — Collect Objects | 1 | Найти и собрать объекты; collected_count == target_count | target_count, object_type, spawn_locations, collection_order, time_limit |
| LEVEL 2 | AR-06 | CHOOSE — Choose Correct Object | 2 | Выбрать правильный объект; selected_object == correct_target | correct_target, false_targets, attempt_limit, error_penalty |
| LEVEL 2 | AR-07 | SEQUENCE — Repeat Sequence | 2 | Повторить показанную последовательность; player_sequence == target_sequence | sequence_length, display_speed, available_elements, attempt_limit |
| LEVEL 2 | AR-08 | MATCH — Match Objects | 2 | Сопоставить пары; correct_matches == required_matches | pairs, false_options, attempt_limit |
| LEVEL 2 | AR-09 | ASSEMBLE — Assemble Object | 2 | Разместить части по местам; all_parts_correctly_placed == true | parts, slots, assembly_order, snap_distance |
| LEVEL 2 | AR-10 | AIM — Aim / Energy Pulse | 2 | Навести прицел и активировать импульс; targets_hit >= required_hits | target_count, target_speed, target_size, shot_delay, time_limit |
| LEVEL 2 | AR-11 | DODGE — Dodge / Avoid Hazard | 2 | Изменить положение/направление устройства; successful_dodges >= required_dodges | attack_direction, reaction_time, attack_frequency, allowed_errors |
| LEVEL 2 | AR-12 | FOLLOW — Follow Target / AR Navigation | 2 | Следовать к игровой зоне; destination_reached == true | Маршрут/проводник задаются сценарием |
| LEVEL 3 | AR-13 | ANALYZE — Scan & Analyze Object | 2 | Осмотреть с нужных сторон или найти элемент; inspection_target_found == true | inspection_target, required_view_angle, inspection_time |
| LEVEL 3 | AR-14 | CODE — Find and Enter Code | 2 | Получить и ввести код; entered_code == correct_code | correct_code, code_length, attempt_limit |
| LEVEL 3 | AR-15 | PUZZLE — Logic Puzzle | 3 | Решить составную головоломку; puzzle_state == solved | Определяются типом головоломки |
| LEVEL 4 | AR-16 | DEFEND — Defend Object | 3 | Защищать объект; protected_object_health > 0 AND all_waves_completed == true | health, enemy_count, enemy_spawn_rate, wave_count, time_limit |
| LEVEL 4 | AR-17 | SYNC — Cooperative Synchronization | 3 | Выполнить связанные действия нескольких игроков в окне; all_required_actions_completed_within_sync_window == true | required_players, sync_window, required_actions |
| LEVEL 4 | AR-18 | ROLE — Player Roles | 3 | Разные задания, видимость, действия и информация по ролям; успех определяет сценарий | SCOUT, ENGINEER, DECODER, OPERATOR |
| LEVEL 4 | AR-19 | CHASE — Multi-Point Chase | 3 | Обнаружение → побег → следование → маркер → задача → новый побег → захват; final_target_captured == true | checkpoint_count, target_behavior, checkpoint_tasks, final_condition |
| LEVEL 5 | AR-20 | BOSS — Boss Encounter | 4 | Композиция фаз существующих механик; all_boss_phases_completed == true | Сценарий фаз, например DODGE → DISCOVER → AIM → SEQUENCE → SYNC |

## Обязательные особенности

- SCAN может создавать портал, терминал, контейнер, персонажа, артефакт, устройство или заражённую зону; результаты: spawn_object, start_animation, unlock_next_step, start_dialogue.
- DISCOVER может помогать стрелкой, звуком/громкостью, индикатором, подсветкой и подсказкой после таймаута.
- TOUCH немедленно даёт визуальную и/или звуковую обратную связь. Действия: activate, open, inspect, collect, start_animation, trigger_event.
- COLLECT показывает прогресс вида 1 / 4. SEQUENCE сначала показывает образец, например BLUE → YELLOW → RED.
- MATCH поддерживает смысловые пары key → lock, energy_core → generator, symbol → terminal. ASSEMBLE отделяет части от слотов.
- DODGE разрешён только в заранее определённых безопасных игровых зонах.
- FOLLOW может использовать след, робота, персонажа, линию энергии, частицы или стрелки.
- ANALYZE ищет символ, код, повреждение, надпись, нужный элемент или заражение.
- CODE допускает источник в AR, физическом объекте, световом полу, другом игроке, предыдущей головоломке или печатном материале.
- PUZZLE включает каналы, лабиринты, вращение, схемы, комбинации символов, изображения и маршрутизацию энергии.
- DEFEND может защищать portal, energy_core, character, terminal или base.
- SYNC требует настоящих согласованных действий нескольких игроков. Его нельзя считать реализованным заменой игроков локальными нажатиями.
- ROLE: SCOUT — поиск; ENGINEER — ремонт/устройства; DECODER — коды/головоломки; OPERATOR — терминалы/системы.
- BOSS не должен становиться независимой реализацией всех действий: он комбинирует имеющиеся механики.

## Уровни и приоритеты

Группы LEVEL 1–5 описывают категории библиотеки. Сложность — отдельная шкала из четырёх значений: 1 INTRO, 2 NORMAL, 3 CHALLENGE, 4 BOSS. Например, ANALYZE относится к LEVEL 3, но имеет сложность 2.

MVP, строго по очереди: AR-01 SCAN → AR-02 DISCOVER → AR-03 TOUCH → AR-05 COLLECT → AR-06 CHOOSE → AR-07 SEQUENCE. Цель — onboarding «AR Инициация».

После проверки MVP: AR-13 ANALYZE → AR-14 CODE → AR-09 ASSEMBLE → AR-10 AIM → AR-17 SYNC. Добавление SYNC потребует отдельного согласования сетевых сессий: текущая первая версия остаётся однопользовательской. Остальные механики — после проверки на реальных сценариях.

## Общий интерфейс

Предварительный жизненный цикл владельца: INIT → READY → START → ACTIVE → SUCCESS / FAIL → COMPLETE → NEXT.

Предусмотреть mechanic_id, конфигурацию, параметры, состояние, progress, условия успеха/неуспеха, события, timeout, подсказки, reset/restart, callback завершения и следующий шаг. Подробная трактовка и минимальные контракты предложены отдельно; после согласования механики внедряются последовательно. Текущий API: MECHANICS_RUNTIME.md.
