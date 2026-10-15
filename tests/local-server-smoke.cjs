const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {spawn} = require('node:child_process')
const root = path.resolve(__dirname, '..')
const port = 18238
const origin = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, [path.join(root, 'local-server/server.cjs')], {env:{...process.env, PORT:String(port), TLS_CERT:'', TLS_KEY:''}, stdio:'pipe'})
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
async function run() {
  for (let i=0; i<50; i++) { try { if ((await fetch(origin)).ok) break } catch (_) {} await delay(100) }
  const html = await (await fetch(origin)).text()
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1])
  assert.equal(scripts.length, 5)
  assert(scripts.every(src => !/^https?:/.test(src)))
  for (const src of scripts) {
    const response = await fetch(new URL(src, origin))
    assert.equal(response.status, 200, src)
    assert.match(response.headers.get('content-type'), /javascript/)
  }
  for (const name of ['engine-binary', 'xrextras', 'landing-page']) {
    const dir = path.join(root, 'external/8thwall', name, 'dist')
    for (const file of fs.readdirSync(dir, {recursive:true})) {
      if (!fs.statSync(path.join(dir,file)).isFile()) continue
      const url = `${origin}/external/8thwall/${name}/dist/${file.replaceAll('\\', '/')}`
      const response = await fetch(url)
      assert.equal(response.status, 200, url)
      assert.equal(Buffer.compare(Buffer.from(await response.arrayBuffer()), fs.readFileSync(path.join(dir,file))), 0, url)
    }
  }
  assert.equal((await fetch(origin + '/missing-file')).status, 404)
  assert.equal((await fetch(origin + '/index.html', {method:'POST'})).status, 405)
  assert.equal((await fetch(origin + '/%2e%2e%5cserver.cjs')).status, 404)
  assert.equal((await fetch(origin + '/index.html', {method:'HEAD'})).headers.get('content-length'), String(Buffer.byteLength(html)))
  console.log('PASS: local HTML, all scripts and vendor resources, MIME types, HEAD, missing files, unsupported methods, traversal protection')
}
run().catch(error => { console.error(error); process.exitCode=1 }).finally(() => server.kill())
