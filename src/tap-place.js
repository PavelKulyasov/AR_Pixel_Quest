// // Component that places cacti where the ground is clicked

// export const tapPlaceComponent = {
//   schema: {
//     min: {default: 6},
//     max: {default: 10},
//   },
//   init() {
//     const ground = document.getElementById('ground')
//     this.prompt = document.getElementById('promptText')
    
//     ground.addEventListener('click', (event) => {
//       // Dismiss the prompt text.
//       this.prompt.style.display = 'none'
      
//       // Create new entity for the new object
//       const newElement = document.createElement('a-entity')

//       // The raycaster gives a location of the touch in the scene
//       const touchPoint = event.detail.intersection.point
//       newElement.setAttribute('position', touchPoint)

//       const randomYRotation = Math.random() * 360
//       newElement.setAttribute('rotation', `0 ${randomYRotation} 0`)

//       const randomScale = Math.floor(Math.random() * (Math.floor(this.data.max) - Math.ceil(this.data.min)) + Math.ceil(this.data.min))

//       newElement.setAttribute('visible', 'false')
//       newElement.setAttribute('scale', '0.0001 0.0001 0.0001')

//       newElement.setAttribute('shadow', {
//         receive: false,
//       })

//       newElement.setAttribute('gltf-model', '#anomalyModel')
//       this.el.sceneEl.appendChild(newElement)

//       newElement.addEventListener('model-loaded', () => {
//         // Once the model is loaded, we are ready to show it popping in using an animation
//         newElement.setAttribute('visible', 'true')
//         newElement.setAttribute('animation', {
//           property: 'scale',
//           to: `${randomScale} ${randomScale} ${randomScale}`,
//           easing: 'easeOutElastic',
//           dur: 800,
//         })
//       })
//     })
//   },
// }
// Component that places anomaly where the ground is tapped
// del or not

export const tapPlaceComponent = {
  schema: {
    min: {default: 0.2},
    max: {default: 0.5},
  },

  init() {
    const ground = document.getElementById('ground')
    this.prompt = document.getElementById('promptText')

    ground.addEventListener('click', (event) => {
      if (!event.detail.intersection) {
        console.warn('No intersection point')
        return
      }

      this.prompt.style.display = 'none'

      // Получаем мировую координату точки касания
      const touchPoint = event.detail.intersection.point.clone()

      console.log('Placement point:', touchPoint)

      // Создаём объект
      const newElement = document.createElement('a-entity')

      // ВАЖНО: объект добавляется непосредственно в сцену,
      // а не в камеру
      this.el.sceneEl.appendChild(newElement)

      // Устанавливаем мировую позицию
      newElement.object3D.position.copy(touchPoint)

      // Случайный поворот
      newElement.object3D.rotation.y =
        THREE.MathUtils.degToRad(Math.random() * 360)

      const randomScale =
        Math.random() * (this.data.max - this.data.min) + this.data.min

      newElement.setAttribute('visible', 'false')
      newElement.setAttribute(
        'scale',
        '0.0001 0.0001 0.0001'
      )

      newElement.setAttribute('shadow', {
        receive: false,
      })

      newElement.setAttribute(
        'gltf-model',
        '#anomalyModel'
      )

      newElement.addEventListener('model-loaded', () => {
        console.log('Anomaly loaded at:', newElement.object3D.position)

        newElement.setAttribute('visible', 'true')

        newElement.setAttribute('animation', {
          property: 'scale',
          to: `${randomScale} ${randomScale} ${randomScale}`,
          easing: 'easeOutElastic',
          dur: 800,
        })
      })
    })
  },
}