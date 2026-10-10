import {createNulikVisual} from './nulik-model'
import {createTerminalDisplay} from './terminal-display'
// Replace a definition's visual with model to use a GLB without changing gameplay.
export function createNullEscapeVisual(root, definition) {
  if (['null', 'assembled'].includes(definition.visual)) return createNulikVisual(root)
  if (['head', 'body', 'left_arm', 'right_arm'].includes(definition.visual)) return createNulikVisual(root, definition.visual)
  function box(size, position, color) {
    const child = document.createElement('a-box')
    child.setAttribute('width', size[0]); child.setAttribute('height', size[1]); child.setAttribute('depth', size[2])
    child.setAttribute('position', position.join(' ')); child.setAttribute('color', color)
    root.appendChild(child)
    return child
  }
  if (definition.visual === 'terminal_display') return createTerminalDisplay(root)
  if (definition.visual === 'silhouette') {
    box([.13, .13, .045], [0, .18, 0], definition.color)
    box([.2, .3, .04], [0, -.04, 0], definition.color)
    return
  }
  const color = definition.color
  if (definition.visual === 'diamond' || definition.visual === 'square') {
    const tile = box([.3, .3, .06], [0, 0, 0], color)
    if (definition.visual === 'diamond') tile.setAttribute('rotation', '0 0 45')
  } else if (definition.visual === 'circle') {
    const tile = document.createElement('a-cylinder')
    tile.setAttribute('radius', .18); tile.setAttribute('height', .06)
    tile.setAttribute('rotation', '90 0 0'); tile.setAttribute('color', color); root.appendChild(tile)
  } else if (definition.visual === 'triangle') {
    const tile = document.createElement('a-triangle')
    tile.setAttribute('vertex-a', '0 .2 0'); tile.setAttribute('vertex-b', '-.2 -.16 0'); tile.setAttribute('vertex-c', '.2 -.16 0')
    tile.setAttribute('material', {color, side: 'double'}); root.appendChild(tile)
  } else if (definition.visual === 'terminal') {
    box([.65, .5, .12], [0, .25, 0], '#142f4d')
    box([.5, .2, .03], [0, .37, .08], color)
  } else if (definition.visual === 'button') box([.2, .16, .12], [0, 0, 0], color)
  else if (definition.visual === 'energy') {
    // The CHOOSE energy cubes are separate story objects, not Nulik's body parts.
    box([.22, .22, .22], [0, 0, 0], color)
    box([.1, .1, .03], [0, 0, .125], '#fff5bc')
  } else if (definition.visual === 'portal') {
    for (const x of [-.3, .3]) box([.07, .8, .1], [x, 0, 0], color)
    for (const y of [-.4, .4]) box([.65, .07, .1], [0, y, 0], color)
    box([.53, .7, .025], [0, 0, -.03], '#292048')
  }
}
