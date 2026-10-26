import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__loginWindow={};
const framework = createPresentationHarness(state);
globalThis.__loginWindowError=class BackendAPIError extends Error {constructor(message,code,status){super(message);this.code=code;this.status=status}};
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessLoginWindow','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_LOGIN_WINDOW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,16);
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {default as current} from './src/response/emailSecurity/login.ts';export {default as old} from 'old-catalog';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'catalog',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-catalog$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/login-window-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/emailSecurity')}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/api$/},()=>({path:'api',namespace:'barrel'}));
 b.onLoad({filter:/.*/,namespace:'barrel'},()=>({resolveDir:process.cwd(),contents:`export {issueBackendLoginWindow} from ${JSON.stringify(resolve('src/api/bot/account.ts'))};export {createBackendRequestContext} from ${JSON.stringify(resolve('src/api/bot/context.ts'))};export {BackendAPIError} from ${JSON.stringify(resolve('src/api/bot/client.ts'))};`}));
 b.onResolve({filter:/^\.\/useMessage$/},()=>({path:'message',namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$|\/src\/api\/bot\/client\.ts$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const BackendAPIError=globalThis.__loginWindowError;
 export const writeContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__loginWindow;s.legacy.push({operation,args});if(s.mode==='current')throw new Error('supplementary API');if(s.row.transport)throw new BackendAPIError('query failed','SDK_NETWORK_ERROR');if(s.row.status!==200)throw new BackendAPIError(s.row.v1?.error?.message??'legacy error',s.row.v1?.error?.code??'SDK_INVALID_RESPONSE',s.row.status);return operation==='get_robot_realm_access'?s.row.access:s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__loginWindow;s.calls.push({operation,args});if(s.row.transport)throw new Error('query failed');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
async function run(mode,row){
 Object.assign(state,{mode,row,sent:[],calls:[],legacy:[],next:0});
 const e={name:row.private?'private.message.create':'message.create',UserId:'player',uid:1,MessageId:'catalog',MessageText:'/登录',isPrivate:row.private};
 await framework.run(handlers[mode], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));return state.sent;
}
test('login window retains full credential quote, links, password button and public refusal with one request',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted')){
  const actual=await run('current',row);assert.deepEqual(state.calls,[{operation:'account.login',args:row.arguments}]);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  assert.deepEqual(actual,await run('old',row),row.state+' '+row.private);
  assert.equal(state.legacy.length,row.private?1:0);
 }
});
test('login errors retain original replies without supplemental requests; only middleware advances next',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.sent.length,0);assert.equal(state.next,1);}
 for(const row of rows.filter(r=>r.private&&r.status!==200&&r.state!=='muted')){await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.sent.length,1);assert.equal(state.next,0);}
 const ready=rows.find(r=>r.state==='bound'&&r.private);
 for(const transport of [false,true]){
  const row={...ready,transport,v1:{data:{}},result:{...ready.result,data:{}}};
  await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);
  assert.deepEqual(state.sent,await run('old',row));
 }
});
