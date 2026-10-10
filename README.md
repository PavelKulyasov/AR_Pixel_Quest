# Основа платформы AR-квестов и Pixel Quest

Общие модули находятся в `platform/`, первая игра — в `games/pixel-quest/`.

- [Архитектура и структура](docs/platform/ARCHITECTURE.md).
- [Что готово, чего не хватает и что обсудить](docs/platform/READINESS.md).
- [Создание новой игры](docs/guides/CREATE_GAME.md).
- [Документация Pixel Quest](games/pixel-quest/docs/README.md).

Запуск: `npm.cmd run serve`. Сборка Pixel Quest: `npm.cmd run build`.
Выбор игры: `npm.cmd run build -- --env game=pixel-quest`.
Проверки: `npm.cmd test` и `npm.cmd run test:browser` (нужен Chrome).

Ниже сохранены сведения об исходном примере 8th Wall и его лицензировании.

---

# A-Frame: World Effects

This example allows the user to grow cacti 🌵  by tapping or clicking the ground. Showcases raycasting,
spawning new objects, and importing a 3D model.

![Cacti sprouting from the ground, in augmented reality, desktop 3D, and virtual reality](./games/pixel-quest/assets/preview.gif)

<details><summary>Try it out</summary>

https://8thwall.org/aframe-world-effects-example/

<img alt="QR Code for the preview link" src="https://8th.io/qr?v=2&url=https://8thwall.org/aframe-world-effects-example/" width=250 height=250 />

</details>

## Usage

1. On this repository, click **Code** > **Download ZIP**. If you clone the repository instead, make sure you have Git LFS installed and run `git lfs pull`
2. Unzip the folder to the location you'd like to work in
3. `npm install`
4. `npm run serve`
5. To connect to a mobile device, follow [these instructions](https://8th.io/test-on-mobile)
6. Recommended: Track your files using [git](https://git-scm.com/about) to avoid losing progress

## Deployment

This project contains Github Actions configuration for deployment to Github Pages, which triggers automatically by pushing the `main` branch. You can also create a production build using `npm run build`, which outputs the production build to the `dist` folder, and publish to the web using [this guide](https://8thwall.org/docs/getting-started/publishing#self-hosting-your-project).

## Questions?

Please raise any questions on [Github Discussions](https://github.com/orgs/8thwall/discussions) or join the [Discord](https://8th.io/discord) to connect with the community.

---

### Optimizing for Metaversal Deployment

With R18, the all-new 8th Wall Engine features Metaversal Deployment, enabling you to create WebAR experiences once and deploy them to smartphones, tablets, computers and both AR and VR headsets. This project has a few platform-specific customizations:

In **body.html**, we add the ```"allowedDevices: any"``` parameter to our ```xrweb``` component in ```<a-scene>``` 
which ensures the project opens on all platforms, including desktop. Environment parameters 
have been customized to generate an open desert space.

---

### About World Tracking

Built entirely using standards-compliant JavaScript and WebGL, 8th Wall’s Simultaneous Localization 
and Mapping (SLAM) engine is hyper-optimized for real-time AR on mobile browsers. Features include
Six Degrees of Freedom (6-DoF), Lighting estimation, instant surface detection and responsive scale.

The Y position of the camera at start effectively determines the scale of virtual content on a surface 
(e.g. smaller y, bigger content). This can be reset at any time by calling 
[```recenter()```](https://www.8thwall.com/docs/web/#recenter).

The camera should NOT be at a height (Y) of zero. It must be set to a non-zero value.

---

#### Attribution

Toon Cactus by [PolyChromic](https://skfb.ly/6Xvws)


### «Побег Нулика» — полный сюжет MVP, Phase 7

Откройте игру с `?episode=null-escape`, нажмите «Начать» и покажите камере маркер огня. После предупреждений Нулика красная 3D-кнопка становится активной. После аварии начинается поиск головы Нулика: поверните камеру и удерживайте голову в центральной рамке полсекунды. После поиска соберите нажатием двигатель и две руки из модели Нулика в любом порядке. После восстановления Нулика выберите энергокуб, пульсирующий два раза подряд перед длинной паузой. Затем запомните подсветку трёх символов и повторите её нажатиями. После последовательности начинается закрытие портала, короткое появление Аномалии и финал. Реализованы все шесть MVP-механик и полный сюжет; следующий этап — итоговая проверка на устройствах (Phase 8).

[Архитектура](games/pixel-quest/docs/episodes/null-escape/ARCHITECTURE.md) · [Проверка на телефоне](games/pixel-quest/docs/episodes/null-escape/ACCEPTANCE_CRITERIA.md).

Отладочная сборка с панелью сцен: `npm run build -- --env debug=true`. Обычная сборка без панели: `npm run build`.
