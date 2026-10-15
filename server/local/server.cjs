const http = require('node:http')
const https = require('node:https')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, 'public')
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.wav':'audio/wav','.mp3':'audio/mpeg','.mp4':'video/mp4'}
function handle(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, {Allow:'GET, HEAD'}); return res.end() }
  let file
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    file = path.resolve(root, '.' + urlPath.replaceAll('\\', '/'))
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Outside public')
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.statSync(file).isFile()) throw new Error('Not a file')
  } catch (_) { res.writeHead(404); return res.end('Not found') }
  res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Content-Length':fs.statSync(file).size, 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'})
  if (req.method === 'HEAD') return res.end()
  const stream = fs.createReadStream(file)
  stream.on('error', () => res.destroy())
  res.on('close', () => stream.destroy())
  stream.pipe(res)
}
const cert = process.env.TLS_CERT
const key = process.env.TLS_KEY
if (Boolean(cert) !== Boolean(key)) throw new Error('Set both TLS_CERT and TLS_KEY')
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Missing public/index.html: run npm run prepare:local first')
const server = cert ? https.createServer({cert:fs.readFileSync(cert), key:fs.readFileSync(key)}, handle) : http.createServer(handle)
const port = Number(process.env.PORT || (cert ? 8443 : 8080))
server.on('error', error => { console.error(error.message); process.exitCode = 1 })
server.listen(port, '0.0.0.0', () => console.log(`Pixel Quest: ${cert ? 'https' : 'http'}://localhost:${port}/; LAN: use server address. Camera on phones requires trusted HTTPS.`))
