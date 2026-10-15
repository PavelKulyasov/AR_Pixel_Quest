# Документация репозитория

Область первой версии: однопользовательские AR-квесты по ссылке для Android и iPhone. Это согласованное направление, а не заявление о завершённой проверке всех устройств.

- [Устройство основы платформы](platform/ARCHITECTURE.md).
- [Анализ готовности и вопросы для обсуждения](platform/READINESS.md).
- [Контракты компонентов и модулей](platform/MODULES.md).
- [Карта переноса файлов](platform/MIGRATION.md).
- [Создание новой игры](guides/CREATE_GAME.md).
- [Документация Pixel Quest](../games/pixel-quest/docs/README.md).
- [Идеи для развития](IDEAS.md).
- [Задачи и подготовка карты помещения для Image Targets](guides/ROOM_MAPPING_TASKS.md).

Перед изменением игровой логики прочитайте документацию выбранной игры: её README, game-design/GAME_ARCHITECTURE.md, game-design/GAME_STATE.md и документы нужного эпизода. Для Pixel Quest они находятся в games/pixel-quest/docs/. Сюжет и правила принадлежат игре; общая платформа не должна импортировать игры.

- [Стандартная библиотека 20 механик](platform/MECHANICS_CATALOG.md).
- [Согласованная архитектура шести MVP-механик](platform/MECHANICS_MVP_PROPOSAL.md).

- [Реализованный runtime, SCAN, DISCOVER, TOUCH, COLLECT, CHOOSE и SEQUENCE](platform/MECHANICS_RUNTIME.md).

- [«Побег Нулика»: архитектура Phase 1–7 и границы реализации](../games/pixel-quest/docs/episodes/null-escape/ARCHITECTURE.md).

- [Ссылки на проекты, режимы и диагностику](../PROJECT_LINKS.md).

- [Подготовка локального сервера без CDN](../server/local/README.md): выполните npm.cmd run prepare:local; готовый комплект появится в local-server/.
