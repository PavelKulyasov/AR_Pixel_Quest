// These are the four authored rigid meshes in Nulik-mobile.glb (not generated proxies).
export const nulikParts = {
  head: 'Mesh_HEAD', body: 'Mesh_BODY', left_arm: 'Mesh_L_HAND', right_arm: 'Mesh_R_HAND',
}
export const nulikObjectIds = ['null', 'null_assembled', 'null_head', 'null_body', 'null_left_arm', 'null_right_arm']

export function createNulikRig(template, selectedPart = null, animations = []) {
  const {Box3, Vector3, Group} = AFRAME.THREE
  // Evaluate the exported hierarchy without any marker/camera transforms.
  const source = template.clone(true)
  source.updateMatrixWorld(true)
  const fullBounds = new Box3().setFromObject(source)
  const fullSize = fullBounds.getSize(new Vector3())
  const extent = Math.max(fullSize.x, fullSize.y, fullSize.z)
  if (!Number.isFinite(extent) || extent <= 0) throw new Error('Invalid Nulik bounds')
  const rig = new Group(), parts = {}, animatedMeshes = []
  for (const [part, prefix] of Object.entries(nulikParts)) {
    let original
    source.traverse(node => { if (node.isMesh && node.name.startsWith(prefix)) original = node })
    if (!original || original.isSkinnedMesh) throw new Error('Missing rigid Nulik part: ' + part)
    if (selectedPart && selectedPart !== part) continue
    const mesh = original.clone(false)
    // Flatten the rigid bone hierarchy while retaining the exact rest pose.
    original.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale)
    const center = new Box3().setFromObject(mesh).getCenter(new Vector3())
    const pivot = new Group()
    pivot.name = 'nulik_' + part
    pivot.position.copy(center)
    mesh.position.sub(center)
    pivot.add(mesh); rig.add(pivot)
    animatedMeshes.push({original, mesh, center})
    parts[part] = {pivot, position: pivot.position.clone(), quaternion: pivot.quaternion.clone(), scale: pivot.scale.clone()}
  }
  if (!Object.keys(parts).length) throw new Error('Unknown Nulik part: ' + selectedPart)
  const bounds = new Box3().setFromObject(rig)
  const center = bounds.getCenter(new Vector3())
  const framingBounds = fullBounds.clone().translate(fullBounds.getCenter(new Vector3()).multiplyScalar(-1))
  const mixer = !selectedPart && animations.length ? new AFRAME.THREE.AnimationMixer(source) : null
  if (mixer) mixer.clipAction(animations.find(clip => clip.name === 'ROOTAction') || animations[0]).play()
  const animate = seconds => {
    if (!mixer) return
    mixer.setTime(seconds)
    source.updateMatrixWorld(true)
    for (const {original, mesh, center} of animatedMeshes) {
      original.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale)
      mesh.position.sub(center)
    }
  }
  const disposeAnimation = () => { if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(source) } }
  return {rig, parts, extent, center, animate, disposeAnimation, bounds: bounds.translate(center.clone().multiplyScalar(-1)), framingBounds}
}
