# Episode 01 implementation

This is an implementation record, not a replacement for the canonical design documents.

## Scope and source of truth

All existing documentation was read before implementation. Episode STATE_FLOW.md supplies the detailed state sequence (including WAITING_CHARACTER_ANSWER and SYSTEM_INTRUSION); GAME_STATE.md supplies centralized progression and marker states. DIALOGUES.md is the source for the character and intrusion lines.

Documentation gaps:
- ACCEPTANCE_CRITERIA.md currently duplicates ANALYTICS.md. Verification below is derived from TECH_SPEC.md, STATE_FLOW.md, AR_MARKERS.md and DIALOGUES.md.
- WORLD_LORE.md currently repeats the documentation overview.
- SCENARIO.md repeats the episode overview and does not supply literal log/file text. The prototype log/file and navigation copy in config.js only express facts from that overview. No creator, dates, cause of deletion failure, developer fate, or Protocol 17 explanation was added.

## Architecture and file plan

Existing architecture: webpack loads games/pixel-quest/app.js before the A-Frame scene; app.js registers tap-place. The scene uses xrweb world tracking, existing XR loading/error components, a camera raycaster, lighting, ground and anomaly.glb. No image-target handlers or target assets existed in the inspected checkout. Webpack already copies image-targets to dist.

Modified:
- games/pixel-quest/app.js: register the episode and select the scene mode; configure three image targets only in episode mode.
- games/pixel-quest/index.html: use platform-mode in place of unconditional tap-place.
- platform/ui/quest-ui.css: shared mobile overlay; games/pixel-quest/styles.css retains demo styling.

Created:
- platform/core/game-state.js: reusable centralized state and marker state operations.
- platform/ar/marker-manager.js: map target names, maintain tracked poses, deduplicate found events and handle loss.
- platform/ar/ar-object-manager.js: cache scene entities at their latest valid target poses, retain them through image loss, hide at episode completion, clean up. Reuses anomaly.glb; terminal/file use simple geometry.
- platform/ui/quest-ui.js: readable HTML UI and actions; stops pointer events from reaching the scene.
- platform/modules/analytics/analytics.js: one optional, exception-isolated console analytics sink.
- games/pixel-quest/episodes/episode-01/config.js: target mapping, AR definitions, episode text, view configuration.
- games/pixel-quest/episodes/episode-01/controller.js: validated episode state transitions and analytics.
- games/pixel-quest/episodes/episode-01/component.js: connect the episode controller to reusable adapters.
- games/pixel-quest/assets/image-targets/: three temporary planar targets, source license and printable index.html.
- tests/episode-01.test.cjs: state/tracking/analytics/asset verification.
- tests/browser-smoke.cjs: actual A-Frame and DOM test with simulated image events.
- this document: setup, decisions, checks and limitations.

Reuse: tap-place.js is untouched and available at ?demo=1. Camera, XR configuration, lights, ground, assets, external engine scripts and webpack configuration remain in place. Default mode is Episode 01. No backend or new dependencies.

## Running

Use npm.cmd on Windows if PowerShell blocks npm.ps1:

~~~text
npm.cmd run serve
npm.cmd run build
node --test tests/episode-01.test.cjs
node tests/browser-smoke.cjs
~~~

The browser test expects Chrome at its usual Windows location; CHROME_PATH can select another Chromium executable. It writes only under ignored tmp/episode-01-smoke and runs a separate headless browser profile.

Open the server root for Episode 01. Open ?demo=1 for the original tap-placement demo. Camera testing on a phone requires a secure HTTPS origin accepted by the device; localhost on a desktop does not make an HTTP LAN address secure.

Open games/pixel-quest/assets/image-targets/index.html on another display or print its images:
1. Fire card: character / MARKER_01.
2. Air card: terminal / MARKER_02.
3. Water card: corrupted file / MARKER_03.

The internal marker IDs are never displayed in the game UI.

Sources: https://github.com/8thwall/studio-image-targets-example (games/pixel-quest/assets/image-targets/LICENSE included).
XR event API: https://8thwall.org/docs/api/engine/aframeevents/xrimagefound
Target configuration: https://8thwall.org/docs/studio/guides/xr/image-targets

To replace targets, supply valid 8th Wall target JSON and its referenced images, update app.js imports and the name-to-marker mapping in episode config. Preserve JSON name equality with the emitted XR target name.

## Interaction and progression

Search -> character -> NO loops / YES confirms -> acknowledge response -> terminal unlocked -> read journal -> acknowledge character response -> file unlocked -> read file -> intrusion messages -> farewell -> complete.

Messages use explicit reading/continue actions instead of automatic timeouts; this keeps text readable at the player's pace. There is no forced duration or timed pacing claim.

Only AVAILABLE markers can begin story content. FOUND and COMPLETED markers retain their objects at the last valid detection pose while their markers are out of view, until the episode completes. COMPLETED markers cannot replay progression. A tracked target that was locked is reconsidered after each progression change, so no rescan is required when it becomes available.

Image tracking loss leaves the placed AR representation visible at its last observed scene pose, keeps state and leaves readable dialogue/actions available. Valid marker updates and reacquisition correct position, rotation and scale to compensate for tracking drift. Physical markers must stay stationary. Completed interactions still accept pose corrections without replaying dialogue. Invalid numeric poses are ignored. Completing the episode hides all placed objects. Only three cached AR anchors can exist. Removing the episode component removes listeners, entities and UI. Reattaching starts a fresh run. Persistence is intentionally omitted.

All story transitions live in the episode controller. AR objects do not unlock markers. Completion and its analytics event occur once per controller run. Analytics failures do not affect gameplay.

## Verification and remaining device checks

Automated checks cover early/unknown markers, invalid actions, NO retry, ordered unlocks, canonical intrusion sequence, final state and flags, repeated detections, tracking loss, analytics failure isolation, asset integrity and disposal.

Browser smoke checks use actual A-Frame and HTML buttons with simulated xrimagefound/xrimageupdated/xrimagelost events. They cover AR pose application, hidden locked content, retained poses after loss/camera movement and corrected poses after reacquisition, already-visible targets unlocking, UI completion, cleanup and a fresh run. They do not validate physical image recognition.

Before accepting on a phone:
- Complete the sequence with printed targets; also scan the terminal/file first.
- Answer NO, lose/reacquire the character target, then answer YES.
- Keep markers stationary. Walk away, turn the camera back and reacquire each marker: the corresponding object must realign with it, including after its interaction ends. While no marker is visible, check world-tracking drift separately; exact relocalization without a reference is not guaranteed.
- Confirm tap controls do not place ground models in episode mode.
- Check model orientation/scale against physical markers and terminal/file visibility.
- Check portrait/landscape text scrolling and browser camera permission/error UI.
- Repeat scans after completion; verify one episode_completed console event.
- Open ?demo=1 and verify original ground placement.
- Check actual play duration; prototype target remains 3–5 minutes, not yet measured.

Risks: physical target quality/lighting, target-relative model orientation, remote engine/CDN availability, mobile GPU behavior and overlay interaction with XR controls require real-device validation. Automated synthetic tracking is not a substitute for this check.

## Пиксельные звуковые сигналы

Модуль `platform/modules/audio/pixel-audio.js` генерирует короткие мелодии через Web Audio API без аудиофайлов. `games/pixel-quest/config/audio-cues.js` содержит частоты и длительности нот; громкость задаётся огибающей GainNode. Справочник API: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext.

Перед каждым блоком речи персонажа звучит четырёхнотный мотив `character`. Перед системным блоком звучит сигнал из поля `systemCue` в `games/pixel-quest/episodes/episode-01/config.js`:

- `granted` — восходящий сигнал разрешения доступа.
- `denied` — нисходящий сигнал запрета доступа.
- `attention` — двойной сигнал внимания (старт, повтор ответа, предупреждение неизвестного пользователя).
- `danger` — чередование низкого и высокого тона (реакция системы «Кто вы?» при вторжении).
- `error` — сигнал сбоя (ошибка ответа и повреждение файла).
- `notification` — обычное уведомление (журнал и нейтральное сообщение).
- `complete` — финальная мелодия завершения эпизода.

Типы назначены явно, без распознавания слов в тексте. Канонические реплики не изменены. Для новых событий используйте соответствующий `systemCue`; отдельного события с репликой «Опасность» в текущем сценарии нет.

Сигналы включаются кнопкой «Включить озвучку» вместе с речью. Повтор реплики повторяет сигнал. Смена сцены диалога, отключение озвучки, скрытие вкладки и удаление интерфейса отменяют звук и ожидающую речь. Между отдельными предложениями одного говорящего сигнал не повторяется. При недоступности Web Audio реплика продолжается без эффекта.

Проверка: `node --test tests/speech-ui.test.cjs tests/pixel-audio.test.cjs tests/episode-01.test.cjs`. На телефоне отдельно проверьте слышимость, баланс с голосом и запуск речи после сигнала в Safari/Chrome.


Tracking reference: https://8thwall.org/docs/troubleshooting/world-tracking-issues and https://8thwall.org/docs/api/engine/xrcontroller/configure. World tracking is explicitly enabled in the scene and controller configuration; no automatic recenter is used.


## Platform extraction

The game now consumes platform/core/episode-runtime.js through platform/ar/episode-component.js. games/pixel-quest/config/game.js supplies game presentation adapters and audio/analytics factories. See docs/platform/ARCHITECTURE.md and docs/platform/MIGRATION.md for the current repository layout. Published marker URLs remain image-targets/index.html. No persistence, general module registry, map or new story mechanics were added.
