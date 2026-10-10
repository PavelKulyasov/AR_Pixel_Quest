// One selected game per page/build; uses the existing A-Frame / 8th Wall globals.
export function registerARGame({component, componentName, imageTargets, demoComponent}) {
  const demo = Boolean(demoComponent && new URLSearchParams(window.location.search).get('demo') === '1')
  if (!demo) {
    const configureTargets = () => XR8.XrController.configure({disableWorldTracking: false, imageTargetData: imageTargets})
    if (window.XR8) configureTargets()
    else window.addEventListener('xrloaded', configureTargets, {once: true})
  }
  if (demoComponent) AFRAME.registerComponent('tap-place', demoComponent)
  AFRAME.registerComponent(componentName, component)
  AFRAME.registerComponent('platform-mode', {
    init() {
      this.start = () => {
        const prompt = document.getElementById('promptText')
        if (demo) this.el.setAttribute('tap-place', '')
        else {
          if (prompt) prompt.style.display = 'none'
          this.el.setAttribute(componentName, '')
        }
      }
      if (this.el.hasLoaded) this.start()
      else this.el.addEventListener('loaded', this.start, {once: true})
    },
    remove() { this.el.removeEventListener('loaded', this.start) },
  })
}
