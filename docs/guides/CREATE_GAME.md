# Создание новой игры на текущей основе

Сейчас это инструкция для разработчика. Визуального редактора и автоматического генератора игры нет.

1. Создайте games/<game-id>/ с папками config/, episodes/, assets/ и docs/. Используйте id вида museum-quest. Для первой проверки можно скопировать только games/pixel-quest/, затем заменить сюжет, идентификаторы, ресурсы и документацию. platform/ не копируйте.
2. В config/game.js задайте название и фабрики используемых модулей. Мелодии задаются в config/audio-cues.js. Новая игра может использовать createUI без createAudio — тогда будут текст и браузерная речь без сигналов.
3. В episodes/<episode-id>/config.js определите targets, objects и представления UI. Сценарные переходы сейчас задаются контроллером JavaScript. Его контракт описан в [MODULES.md](../platform/MODULES.md).
4. Создайте компонент через createEpisodeComponent({episode, createController, createUI}). Переиспользуйте createGameState для маркерного квеста либо реализуйте совместимое state в контроллере. Общая платформа не должна узнавать имена вашего сюжета.
5. В index.html оставьте рабочие подключения движка, a-scene с platform-mode и xrweb, камеру и assets. Добавьте ресурсы модели и согласуйте их id с model в конфигурации. Уберите игровые метаданные предыдущей игры. Демонстрационный tap-place необязателен.
6. В app.js подключите общий CSS и registerARGame({component, componentName, imageTargets, demoComponent?}). Импортируйте JSON маркеров из assets/image-targets/. Имена JSON должны совпадать с ключами targets; imagePath должен указывать на опубликованный image-targets/… . Распечатки доступны по image-targets/index.html после сборки.
7. Запустите из корня:

```powershell
npm.cmd run serve -- --env game=museum-quest
npm.cmd run build -- --env game=museum-quest
```

Результат — dist/. По умолчанию сборка выбирает pixel-quest. Каждую игру публикуйте отдельной сборкой: общий dist/ не является хранилищем всех игр. При переходе между играми используйте чистый каталог сборки; автоматическая очистка dist/ пока не включена.

8. Добавьте тесты контроллера новой игры и браузерное прохождение по примеру tests/episode-01.test.cjs и tests/browser-smoke.cjs. Проверьте ранние маркеры, повторы событий, потерю/возврат трекинга, завершение и очистку.
9. Проверьте камеру и звук на физическом Android/iPhone через HTTPS. Обычный HTTP-адрес компьютера в локальной сети для доступа к камере не подходит. Не считайте имитированные XR-события проверкой реального распознавания.
10. Зафиксируйте изменения в корневом CHANGELOG.md и согласуйте публикацию. Существующий workflow собирает игру по умолчанию — для отдельной игры настройка публикации требует адаптации.

Сохранения, инвентарь, граф диалогов, общая карта и подключение модулей по именам пока не доступны. План развития находится в [READINESS.md](../platform/READINESS.md).


## Новый сценарий на механиках

В качестве минимального примера используйте games/pixel-quest/episodes/ar-initiation/. В config/game.js создайте createMechanicRegistry([scanMechanic]); определите scenario/content и подключите createMechanicEpisodeComponent. Контракт: [MECHANICS_RUNTIME.md](../platform/MECHANICS_RUNTIME.md).

Поддержаны AR-01 SCAN, AR-02 DISCOVER, AR-03 TOUCH, AR-05 COLLECT, AR-06 CHOOSE и AR-07 SEQUENCE (контракт в MECHANICS_RUNTIME.md). При добавлении другой оболочки меняйте marker_id, определения объектов и тексты, а не scan.js. Не включайте в сценарий AR-04 и AR-08–AR-20 до появления их реализаций: реестр намеренно отклоняет такие шаги.

Для TOUCH укажите content.target_id заранее размещённого объекта и стандартное условие target_touched == true; подключите touchMechanic и адаптер с objectTouch. Тексты шага остаются в content игры. Для другого объекта меняйте target_id, не создавайте отдельную механику.
