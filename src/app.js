// Copyright (c) 2022 8th Wall, Inc.
import './index.css'
import {tapPlaceComponent} from './tap-place'
import {episodeComponent} from './episodes/episode-01/component'
import fire from '../image-targets/20_Element_Fire.json'
import air from '../image-targets/22_Element_Air.json'
import water from '../image-targets/23_Element_Water.json'

const demo = new URLSearchParams(window.location.search).get('demo') === '1'
if (!demo) {
  const configureTargets = () => XR8.XrController.configure({imageTargetData: [fire, air, water]})
  if (window.XR8) configureTargets()
  else window.addEventListener('xrloaded', configureTargets, {once: true})
}
AFRAME.registerComponent('tap-place', tapPlaceComponent)
AFRAME.registerComponent('episode-01', episodeComponent)
AFRAME.registerComponent('quest-mode', {
  init() {
    this.start = () => {
      const prompt = document.getElementById('promptText')
      if (demo) this.el.setAttribute('tap-place', '')
      else {
        prompt.style.display = 'none'
        this.el.setAttribute('episode-01', '')
      }
    }
    if (this.el.hasLoaded) this.start()
    else this.el.addEventListener('loaded', this.start, {once: true})
  },
  remove() { this.el.removeEventListener('loaded', this.start) },
})