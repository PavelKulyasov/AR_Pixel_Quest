// npm.cmd install --prefix tmp/nulik-tools --no-package-lock --no-save sharp
// node scripts/optimize-props.cjs <directory containing button.glb, portal.glb, terminal.glb>
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const sharp = require(require.resolve('sharp', {paths: [root, path.join(root, 'tmp/nulik-tools')]}))
const sourceDirectory = process.argv[2]
if (!sourceDirectory) throw new Error('Provide source GLB directory')

const align4 = value => Math.ceil(value / 4) * 4
function readGlb(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF')
  assert.equal(bytes.readUInt32LE(4), 2)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a)
  const jsonLength = bytes.readUInt32LE(12)
  const document = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength))
  const binHeader = 20 + jsonLength
  assert.equal(bytes.readUInt32LE(binHeader + 4), 0x004e4942)
  const bin = bytes.subarray(binHeader + 8, binHeader + 8 + bytes.readUInt32LE(binHeader))
  assert.equal(document.buffers.length, 1)
  assert.ok(!document.buffers[0].uri)
  return {document, bin}
}
const viewBytes = (asset, index) => {
  const view = asset.document.bufferViews[index]
  assert.equal(view.buffer, 0)
  return asset.bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength)
}
async function main(name) {
  const source = path.join(sourceDirectory, name + '.glb')
  const destination = path.join(root, 'games/pixel-quest/assets', name + '-mobile.glb')
  const limit = name === 'button' ? 512 : 1024
  const original = fs.readFileSync(source)
  const input = readGlb(original)
  const document = structuredClone(input.document)
  const replacements = new Map()
  const colorImages = new Set(document.materials.flatMap(material => {
    const texture = material.pbrMetallicRoughness?.baseColorTexture
    return texture ? [document.textures[texture.index].source] : []
  }))
  for (const [index, image] of document.images.entries()) {
    assert.ok(Number.isInteger(image.bufferView) && !image.uri)
    assert.ok(!replacements.has(image.bufferView))
    const data = viewBytes(input, image.bufferView)
    const resized = sharp(data).resize({width: limit, height: limit, fit: 'inside', withoutEnlargement: true})
    // Preserve numeric normal/roughness data in PNG; only base color uses lossy JPEG.
    const color = colorImages.has(index) && !(await sharp(data).metadata()).hasAlpha
    const encoded = await (color ? resized.jpeg({quality: 88, chromaSubsampling: '4:4:4'})
      : resized.png({compressionLevel: 9, palette: false})).toBuffer()
    const metadata = await sharp(encoded).metadata()
    assert.ok(metadata.width <= limit && metadata.height <= limit)
    image.mimeType = color ? 'image/jpeg' : 'image/png'
    replacements.set(image.bufferView, encoded)
    console.log(`${image.name}: ${data.length} -> ${encoded.length} bytes, ${metadata.width}x${metadata.height}, ${image.mimeType}`)
  }
  const chunks = []
  let offset = 0
  document.bufferViews.forEach((view, index) => {
    const data = replacements.get(index) || viewBytes(input, index)
    view.byteOffset = offset
    view.byteLength = data.length
    chunks.push(data, Buffer.alloc(align4(data.length) - data.length))
    offset += align4(data.length)
  })
  document.buffers[0].byteLength = offset
  const bin = Buffer.concat(chunks)
  const json = Buffer.from(JSON.stringify(document))
  const jsonPadded = Buffer.alloc(align4(json.length), 0x20)
  json.copy(jsonPadded)
  const header = Buffer.alloc(20)
  header.write('glTF'); header.writeUInt32LE(2, 4)
  header.writeUInt32LE(20 + jsonPadded.length + 8 + bin.length, 8)
  header.writeUInt32LE(jsonPadded.length, 12); header.writeUInt32LE(0x4e4f534a, 16)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(bin.length); binHeader.writeUInt32LE(0x004e4942, 4)
  const output = Buffer.concat([header, jsonPadded, binHeader, bin])
  const checked = readGlb(output)
  for (let i = 0; i < document.bufferViews.length; i++) {
    if (!replacements.has(i)) assert.deepEqual(viewBytes(checked, i), viewBytes(input, i))
  }
  for (const key of Object.keys(input.document)) {
    if (!['images', 'bufferViews', 'buffers'].includes(key)) assert.deepEqual(checked.document[key], input.document[key])
  }
  fs.writeFileSync(destination, output)
  assert.deepEqual(fs.readFileSync(source), original)
  console.log(JSON.stringify({name, sourceBytes: original.length, outputBytes: output.length,
    reductionPercent: +(100 * (1 - output.length / original.length)).toFixed(1),
    geometryAndAnimationUnchanged: true}))
}
(async () => { for (const name of ['button', 'portal', 'terminal']) await main(name) })().catch(error => { console.error(error); process.exitCode = 1 })
