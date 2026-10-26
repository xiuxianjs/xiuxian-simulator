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
const state=globalThis.__emailChange={};
const framework = createPresentationHarness(state);
globalThis.__emailChangeError=class BackendAPIError extends Error {constructor(message,code,status){super(message);this.code=code;this.status=status}};
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessEmailChange','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_EMAIL_CHANGE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,264);
async function load(flow){
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {default as current} from './src/response/emailSecurity/${flow}.ts';export {default as old} from 'old-catalog';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'catalog',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-catalog$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/${flow==='changeEmail'?'change-email':'change-account'}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:resolve('src/response/emailSecurity')}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/api$/},()=>({path:'api',namespace:'barrel'}));
 b.onLoad({filter:/.*/,namespace:'barrel'},()=>({resolveDir:process.cwd(),contents:`export {beginBackendEmailVerification} from ${JSON.stringify(resolve('src/api/bot/account.ts'))};export {createBackendRequestContext} from ${JSON.stringify(resolve('src/api/bot/context.ts'))};export {BackendAPIError} from ${JSON.stringify(resolve('src/api/bot/client.ts'))};`}));
 b.onResolve({filter:/^\.\/useMessage$/},()=>({path:'message',namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$|\/src\/api\/bot\/client\.ts$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const BackendAPIError=globalThis.__emailChangeError;
 export const writeContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__emailChange;s.legacy.push({operation,args});if(s.mode==='current')throw new Error('supplementary API');if(s.row.transport)throw new BackendAPIError('query failed','SDK_NETWORK_ERROR');if(s.row.status!==202)throw new BackendAPIError(s.row.v1?.error?.message??('HTTP '+s.row.status),s.row.v1?.error?.code??'SDK_INVALID_RESPONSE',s.row.status);return operation==='get_robot_realm_access'?s.row.access:s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__emailChange;s.calls.push({operation,args});if(s.row.transport)throw new Error('query failed');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
return await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
}
const handlers={'account.change-email':await load('changeEmail'),'account.change-account':await load('changeAccount')};
async function run(mode,row){
 Object.assign(state,{mode,row,sent:[],calls:[],legacy:[],next:0});
 const e={name:row.private?'private.message.create':'message.create',UserId:'player',uid:1,MessageId:'catalog',MessageText:row.arguments.input,isPrivate:row.private};
 await framework.run(handlers[row.operation][mode], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));return state.sent;
}
test('email and account changes retain full original bubbles and Number parsing with one business call',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted')){
  if(row.operation==='account.change-account'){const n=Number(row.raw);assert.equal(row.value,Number.isSafeInteger(n)&&n>0?String(n):'');}
  const actual=await run('current',row);assert.deepEqual(state.calls,[{operation:row.operation,args:row.arguments}]);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  assert.deepEqual(actual,await run('old',row),row.operation+' '+row.state+' '+row.private+' '+row.raw);
  assert.equal(state.legacy.length,row.status?1:0);
 }
});
test('middleware alone advances parent next; failed requests and DTOs never supplement another API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.sent.length,0);assert.equal(state.next,1);}
 for(const operation of ['account.change-email','account.change-account']){
  const ready=rows.find(r=>r.operation===operation&&r.result.success&&r.result.branch==='business');
  await run('current',{...ready,transport:true});assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);
  assert.deepEqual(state.sent,await run('old',{...ready,transport:true}));
  await run('current',{...ready,result:{...ready.result,data:{}}});assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);
 }
});
