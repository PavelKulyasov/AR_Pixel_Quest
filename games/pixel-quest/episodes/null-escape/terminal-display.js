// Canvas keeps Cyrillic text readable without an external font atlas.
export function createTerminalDisplay(root) {
  const {CanvasTexture, MeshBasicMaterial, PlaneGeometry, Mesh, DoubleSide} = AFRAME.THREE
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 384
  const context = canvas.getContext('2d')
  const texture = new CanvasTexture(canvas)
  const material = new MeshBasicMaterial({map: texture, side: DoubleSide})
  const geometry = new PlaneGeometry(.3, .2)
  const mesh = new Mesh(geometry, material); root.object3D.add(mesh)
  root.object3D.userData.setTerminalText = value => {
    context.fillStyle = '#071b32'; context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#9affef'; context.textAlign = 'center'; context.textBaseline = 'middle'
    context.font = value.length <= 4 ? 'bold 220px monospace' : 'bold 94px monospace'
    const lines = value.split(String.fromCharCode(10))
    lines.forEach((line, index) => context.fillText(line, 512, 192 + (index - (lines.length - 1) / 2) * 112, 970))
    texture.needsUpdate = true
    root.object3D.userData.terminalText = value
  }
  root.object3D.userData.setTerminalText('')
  return () => {
    root.object3D.remove(mesh); geometry.dispose(); material.dispose(); texture.dispose()
    delete root.object3D.userData.setTerminalText
  }
}
