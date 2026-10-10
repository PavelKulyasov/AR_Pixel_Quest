# Перенос основы платформы

Пути относительно корня репозитория. Содержимое ресурсов проверено по SHA-256 при переносе. Исторические записи CHANGELOG.md сохраняют прежние пути.

| Прежний путь | Новый путь |
| --- | --- |
| `src/game/game-state.js` | `platform/core/game-state.js` |
| `src/game/marker-manager.js` | `platform/ar/marker-manager.js` |
| `src/game/ar-object-manager.js` | `platform/ar/ar-object-manager.js` |
| `src/game/ui.js` | `platform/ui/quest-ui.js` |
| `src/game/pixel-audio.js` | `platform/modules/audio/pixel-audio.js` |
| `src/game/analytics.js` | `platform/modules/analytics/analytics.js` |
| `src/app.js` | `games/pixel-quest/app.js` |
| `src/index.html` | `games/pixel-quest/index.html` |
| `src/index.css` | `games/pixel-quest/styles.css` |
| `src/tap-place.js` | `games/pixel-quest/demo/tap-place.js` |
| `docs/README.md` | `games/pixel-quest/docs/README.md` |
| `src/episodes/episode-01/component.js` | `games/pixel-quest/episodes/episode-01/component.js` |
| `src/episodes/episode-01/config.js` | `games/pixel-quest/episodes/episode-01/config.js` |
| `src/episodes/episode-01/controller.js` | `games/pixel-quest/episodes/episode-01/controller.js` |
| `src/assets/anomaly.glb` | `games/pixel-quest/assets/anomaly.glb` |
| `src/assets/preview.gif` | `games/pixel-quest/assets/preview.gif` |
| `src/assets/sand.jpg` | `games/pixel-quest/assets/sand.jpg` |
| `image-targets/20_Element_Fire.json` | `games/pixel-quest/assets/image-targets/20_Element_Fire.json` |
| `image-targets/20_Element_Fire_cropped.png` | `games/pixel-quest/assets/image-targets/20_Element_Fire_cropped.png` |
| `image-targets/20_Element_Fire_geometry.png` | `games/pixel-quest/assets/image-targets/20_Element_Fire_geometry.png` |
| `image-targets/20_Element_Fire_luminance.png` | `games/pixel-quest/assets/image-targets/20_Element_Fire_luminance.png` |
| `image-targets/20_Element_Fire_original.png` | `games/pixel-quest/assets/image-targets/20_Element_Fire_original.png` |
| `image-targets/20_Element_Fire_thumbnail.png` | `games/pixel-quest/assets/image-targets/20_Element_Fire_thumbnail.png` |
| `image-targets/22_Element_Air.json` | `games/pixel-quest/assets/image-targets/22_Element_Air.json` |
| `image-targets/22_Element_Air_cropped.png` | `games/pixel-quest/assets/image-targets/22_Element_Air_cropped.png` |
| `image-targets/22_Element_Air_geometry.png` | `games/pixel-quest/assets/image-targets/22_Element_Air_geometry.png` |
| `image-targets/22_Element_Air_luminance.png` | `games/pixel-quest/assets/image-targets/22_Element_Air_luminance.png` |
| `image-targets/22_Element_Air_original.png` | `games/pixel-quest/assets/image-targets/22_Element_Air_original.png` |
| `image-targets/22_Element_Air_thumbnail.png` | `games/pixel-quest/assets/image-targets/22_Element_Air_thumbnail.png` |
| `image-targets/23_Element_Water.json` | `games/pixel-quest/assets/image-targets/23_Element_Water.json` |
| `image-targets/23_Element_Water_cropped.png` | `games/pixel-quest/assets/image-targets/23_Element_Water_cropped.png` |
| `image-targets/23_Element_Water_geometry.png` | `games/pixel-quest/assets/image-targets/23_Element_Water_geometry.png` |
| `image-targets/23_Element_Water_luminance.png` | `games/pixel-quest/assets/image-targets/23_Element_Water_luminance.png` |
| `image-targets/23_Element_Water_original.png` | `games/pixel-quest/assets/image-targets/23_Element_Water_original.png` |
| `image-targets/23_Element_Water_thumbnail.png` | `games/pixel-quest/assets/image-targets/23_Element_Water_thumbnail.png` |
| `image-targets/index.html` | `games/pixel-quest/assets/image-targets/index.html` |
| `image-targets/LICENSE` | `games/pixel-quest/assets/image-targets/LICENSE` |
| `docs/episodes/episode-01/ACCEPTANCE_CRITERIA.md` | `games/pixel-quest/docs/episodes/episode-01/ACCEPTANCE_CRITERIA.md` |
| `docs/episodes/episode-01/ANALYTICS.md` | `games/pixel-quest/docs/episodes/episode-01/ANALYTICS.md` |
| `docs/episodes/episode-01/AR_OBJECTS.md` | `games/pixel-quest/docs/episodes/episode-01/AR_OBJECTS.md` |
| `docs/episodes/episode-01/DIALOGUES.md` | `games/pixel-quest/docs/episodes/episode-01/DIALOGUES.md` |
| `docs/episodes/episode-01/IMPLEMENTATION.md` | `games/pixel-quest/docs/episodes/episode-01/IMPLEMENTATION.md` |
| `docs/episodes/episode-01/README.md` | `games/pixel-quest/docs/episodes/episode-01/README.md` |
| `docs/episodes/episode-01/SCENARIO.md` | `games/pixel-quest/docs/episodes/episode-01/SCENARIO.md` |
| `docs/episodes/episode-01/STATE_FLOW.md` | `games/pixel-quest/docs/episodes/episode-01/STATE_FLOW.md` |
| `docs/episodes/episode-01/TECH_SPEC.md` | `games/pixel-quest/docs/episodes/episode-01/TECH_SPEC.md` |
| `docs/lore/PROTOCOL_17.md` | `games/pixel-quest/docs/lore/PROTOCOL_17.md` |
| `docs/lore/WORLD_LORE.md` | `games/pixel-quest/docs/lore/WORLD_LORE.md` |
| `docs/game-design/AR_MARKERS.md` | `games/pixel-quest/docs/game-design/AR_MARKERS.md` |
| `docs/game-design/GAME_ARCHITECTURE.md` | `games/pixel-quest/docs/game-design/GAME_ARCHITECTURE.md` |
| `docs/game-design/GAME_STATE.md` | `games/pixel-quest/docs/game-design/GAME_STATE.md` |

Дополнительно выделены `platform/core/episode-runtime.js`, `platform/ar/episode-component.js`, `platform/ar/register-game.js`, `platform/ui/quest-ui.css`, `games/pixel-quest/config/game.js` и `games/pixel-quest/config/audio-cues.js`.
