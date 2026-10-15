const fs = require('node:fs')
const path = require('node:path')
const {execFileSync} = require('node:child_process')
const root = path.resolve(__dirname, '..')
// Use the installed webpack directly; preparation requires no package downloads.
execFileSync(process.execPath, [require.resolve('webpack/bin/webpack.js'), '--config', 'config/webpack.config.js'], {cwd:root, stdio:'inherit'})
const output = path.join(root, 'local-server')
fs.mkdirSync(output, {recursive:true})
fs.cpSync(path.join(root, 'dist'), path.join(output, 'public'), {recursive:true})
for (const file of ['server.cjs', 'Caddyfile', 'README.md', 'start-http.cmd']) {
  fs.copyFileSync(path.join(root, 'server/local', file), path.join(output, file))
}
console.log('Prepared local-server/: public files and server launch instructions. No npm install required on target server; Node.js is required for server.cjs.')
