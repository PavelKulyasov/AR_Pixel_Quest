# Episode 01 implementation

This is an implementation record, not a replacement for the canonical design documents.

## Scope and source of truth

All existing documentation was read before implementation. Episode STATE_FLOW.md supplies the detailed state sequence (including WAITING_CHARACTER_ANSWER and SYSTEM_INTRUSION); GAME_STATE.md supplies centralized progression and marker states. DIALOGUES.md is the source for the character and intrusion lines.

Documentation gaps:
- ACCEPTANCE_CRITERIA.md currently duplicates ANALYTICS.md. Verification below is derived from TECH_SPEC.md, STATE_FLOW.md, AR_MARKERS.md and DIALOGUES.md.
- WORLD_LORE.md currently repeats the documentation overview.
- SCENARIO.md repeats the episode overview and does not supply literal log/file text. The prototype log/file and navigation copy in config.js only express facts from that overview. No creator, dates, cause of deletion failure, developer fate, or Protocol 17 explanation was added.

## Architecture and file plan

Existing architecture: webpack loads src/app.js before the A-Frame scene; app.js registers tap-place. The scene uses xrweb world tracking, existing XR loading/error components, a camera raycaster, lighting, ground and anomaly.glb. No image-target handlers or target assets existed in the inspected checkout. Webpack already copies image-targets to dist.

Modified:
- src/app.js: register the episode and select the scene mode; configure three image targets only in episode mode.
- src/index.html: use quest-mode in place of unconditional tap-place.
- src/index.css: add an independent HTML overlay with mobile buttons and separate task/system/character/status elements.

Created:
- src/game/game-state.js: reusable centralized state and marker state operations.
- src/game/marker-manager.js: map target names, maintain tracked poses, deduplicate found events and handle loss.
- src/game/ar-object-manager.js: cache target-anchored entities, update their poses, hide on loss, clean up. Reuses anomaly.glb; terminal/file use simple geometry.
- src/game/ui.js: readable HTML UI and actions; stops pointer events from reaching the scene.
- src/game/analytics.js: one optional, exception-isolated console analytics sink.
- src/episodes/episode-01/config.js: target mapping, AR definitions, episode text, view configuration.
- src/episodes/episode-01/controller.js: validated episode state transitions and analytics.
- src/episodes/episode-01/component.js: connect the episode controller to reusable adapters.
- image-targets/: three temporary planar targets, source license and printable index.html.
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

Open image-targets/index.html on another display or print its images:
1. Fire card: character / MARKER_01.
2. Air card: terminal / MARKER_02.
3. Water card: corrupted file / MARKER_03.

The internal marker IDs are never displayed in the game UI.

Sources: https://github.com/8thwall/studio-image-targets-example (image-targets/LICENSE included).
XR event API: https://8thwall.org/docs/api/engine/aframeevents/xrimagefound
Target configuration: https://8thwall.org/docs/studio/guides/xr/image-targets

To replace targets, supply valid 8th Wall target JSON and its referenced images, update app.js imports and the name-to-marker mapping in episode config. Preserve JSON name equality with the emitted XR target name.

## Interaction and progression

Search -> character -> NO loops / YES confirms -> acknowledge response -> terminal unlocked -> read journal -> acknowledge character response -> file unlocked -> read file -> intrusion messages -> farewell -> complete.

Messages use explicit reading/continue actions instead of automatic timeouts; this keeps text readable at the player's pace. There is no forced duration or timed pacing claim.

Only AVAILABLE markers can begin story content. FOUND markers restore their cached object after tracking returns. COMPLETED markers cannot replay progression. A tracked target that was locked is reconsidered after each progression change, so no rescan is required when it becomes available.

Tracking loss hides the AR representation, keeps state and leaves readable dialogue/actions available. Only three cached AR anchors can exist. Removing the episode component removes listeners, entities and UI. Reattaching starts a fresh run. Persistence is intentionally omitted.

All story transitions live in the episode controller. AR objects do not unlock markers. Completion and its analytics event occur once per controller run. Analytics failures do not affect gameplay.

## Verification and remaining device checks

Automated checks cover early/unknown markers, invalid actions, NO retry, ordered unlocks, canonical intrusion sequence, final state and flags, repeated detections, tracking loss, analytics failure isolation, asset integrity and disposal.

Browser smoke checks use actual A-Frame and HTML buttons with simulated xrimagefound/xrimageupdated/xrimagelost events. They cover AR pose application, hidden locked content, restoration, already-visible targets unlocking, UI completion, cleanup and a fresh run. They do not validate physical image recognition.

Before accepting on a phone:
- Complete the sequence with printed targets; also scan the terminal/file first.
- Answer NO, lose/reacquire the character target, then answer YES.
- Lose/reacquire tracking at each step; ensure readable text and progress remain.
- Confirm tap controls do not place ground models in episode mode.
- Check model orientation/scale against physical markers and terminal/file visibility.
- Check portrait/landscape text scrolling and browser camera permission/error UI.
- Repeat scans after completion; verify one episode_completed console event.
- Open ?demo=1 and verify original ground placement.
- Check actual play duration; prototype target remains 3–5 minutes, not yet measured.

Risks: physical target quality/lighting, target-relative model orientation, remote engine/CDN availability, mobile GPU behavior and overlay interaction with XR controls require real-device validation. Automated synthetic tracking is not a substitute for this check.
