# Контракты текущей основы и будущих модулей

## Работает сейчас

createEpisodeComponent({episode, createController, createUI}) создаёт компонент A-Frame. Он использует createEpisodeRuntime из core/.

- episode: {id, targets, objects}. targets сопоставляет имя распознаваемого изображения внутреннему id; objects содержит {id, model?, color}. model — ссылка на ресурс сцены. Без model используется простой прямоугольный объект.
- createController({render}): возвращает {state, start(), detect(id), action(id), dispose()}. state содержит completed и markers. Фабрика не должна вызывать render до start(): адаптеры ещё инициализируются.
- createUI(onAction): возвращает {render(view), tracking(message), dispose()}. render получает {task?, system?, character?, systemCue?, actions?: [{id, label}]}.
- createObjects(definitions): возвращает {show(id, pose), hide(id), dispose()}.
- createMarkers(targets, {found, updated, lost}): возвращает {tracked: Map, dispose()}. События начинают поступать после создания адаптеров; tracked содержит текущие наблюдения, а не постоянную карту местности.

createUI поддерживает параметры title, createAudio, formatActionLabel, formatSpeech. Его аудиообъект имеет unlock(), play(cue, done), stop(), dispose(). play вызывает done после эффекта или при недоступности эффекта; stop отменяет ожидающий вызов. Без createAudio используется пустой эффект с немедленным продолжением речи.

createPixelAudio(cues) принимает словарь массивов [частота, длительность]. Названия сигналов и ноты принадлежат игре. Реализация рассчитана на короткие сигналы, не заменяет микшер или проигрыватель фоновой музыки.

createAnalytics(episode, sink?) возвращает функцию (event, currentStep, once = true). Она добавляет время и предотвращает повторы событий по имени. По умолчанию sink — console.info; это диагностика, не серверная аналитика.

В games/pixel-quest/config/game.js список modules содержит реальные фабрики audio и analytics. Они используются при создании UI и контроллера. Это ручная композиция JavaScript, не установка плагинов по строковым именам.

## Реестр механик и общие события

Архитектура MVP согласована 2026-09-27. Реализованы отдельный FIFO event bus, clock активного времени, lifecycle, registry и scenario-runner. В game.mechanics подключены AR-01 SCAN, AR-02 DISCOVER, AR-03 TOUCH, AR-05 COLLECT, AR-06 CHOOSE и AR-07 SEQUENCE. Остальные типы пока перечислены только в каноническом каталоге.

Контракты и сценарий подключения описаны в [MECHANICS_RUNTIME.md](MECHANICS_RUNTIME.md). Пример работающей конфигурации — games/pixel-quest/episodes/ar-initiation/scenario.js. Прежние фабрики audio/analytics и интерфейс первого эпизода остаются действующими.

Универсального установщика плагинов, удалённой загрузки модулей, localStorage и восстановления между сеансами нет. Реестр проверяет api_version=1 и требуемые возможности адаптеров; это явная композиция зарегистрированных фабрик.

Стандартные ID и имена: [MECHANICS_CATALOG.md](MECHANICS_CATALOG.md). Согласованный план дальнейших этапов: [MECHANICS_MVP_PROPOSAL.md](MECHANICS_MVP_PROPOSAL.md).
