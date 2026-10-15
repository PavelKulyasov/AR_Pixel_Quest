const {spawn} = require('node:child_process')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
process.chdir(root)
const delay = ms => new Promise(r=>setTimeout(r,ms))
const server = spawn(process.execPath, ['local-server/server.cjs'], {env:{...process.env,PORT:'18239'},stdio:'ignore'})
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless','--no-first-run','--disable-gpu','--remote-debugging-port=19239','--user-data-dir='+path.join(root,'tmp/local-vendor/chrome-profile'),'about:blank'], {stdio:'ignore'})
let socket
async function run(){
 let targets
 for(let i=0;i<100;i++){try{targets=await(await fetch('http://127.0.0.1:19239/json')).json();break}catch{}await delay(100)}
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl)
 await new Promise(r=>socket.addEventListener('open',r,{once:true}))
 let id=0;const pending=new Map();const requests=[];const failed=[]
 socket.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(msg.id){pending.get(msg.id)?.(msg.result);pending.delete(msg.id)}if(msg.method==='Network.requestWillBeSent')requests.push(msg.params.request.url);if(msg.method==='Network.loadingFailed')failed.push(msg.params.errorText)})
 const send=(method,params={})=>new Promise(resolve=>{const n=++id;pending.set(n,resolve);socket.send(JSON.stringify({id:n,method,params}))})
 await send('Network.enable');await send('Page.enable');await send('Page.navigate',{url:'http://127.0.0.1:18239/'})
 await delay(18000)
 const result=await send('Runtime.evaluate',{expression:'JSON.stringify({xr:!!window.XR8,controller:!!window.XR8?.XrController,extras:!!window.XRExtras,landing:!!window.LandingPage,text:document.body.innerText.slice(0,500)})',returnByValue:true})
 console.log('Runtime:',result.result?.value)
 console.log('HTTP requests:',JSON.stringify(requests.filter(u=>/^https?:/.test(u)),null,2));console.log('Failed:',failed)
 const external=requests.filter(u=>/^https?:/.test(u)&&!u.startsWith('http://127.0.0.1:18239/'))
 if(external.length)throw new Error('External requests: '+external.join(', '))
 const state=JSON.parse(result.result.value)
 if(!state.xr||!state.controller||!state.extras||!state.landing)throw new Error('Libraries did not initialize')
 console.log('PASS: real browser initialized XR8 + SLAM, XRExtras, LandingPage without external HTTP requests')
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{socket?.close();chrome.kill();server.kill()})
