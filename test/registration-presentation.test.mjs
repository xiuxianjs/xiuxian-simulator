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
const state=globalThis.__registration={};
const framework = createPresentationHarness(state);
globalThis.__registrationError=class BackendAPIError extends Error {constructor(message,code,status){super(message);this.code=code;this.status=status}};
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessRegistration','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_REGISTRATION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,78);
async function load(flow){
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {default as current} from './src/response/start/res.ts';export {default as old} from 'old-catalog';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'catalog',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-catalog$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/registration-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:resolve('src/response/start')}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/api$/},()=>({path:'api',namespace:'barrel'}));
 b.onLoad({filter:/.*/,namespace:'barrel'},()=>({resolveDir:process.cwd(),contents:`export {issueBackendLoginWindow} from ${JSON.stringify(resolve('src/api/bot/account.ts'))};export {createBackendRequestContext} from ${JSON.stringify(resolve('src/api/bot/context.ts'))};export {BackendAPIError} from ${JSON.stringify(resolve('src/api/bot/client.ts'))};`}));
 b.onResolve({filter:/^@src\/api\/bot\/identity$/},()=>({path:'identity',namespace:'seam'}));
 b.onResolve({filter:/^\.\/useMessage$/},()=>({path:'message',namespace:'seam'}));
 b.onResolve({filter:/^@src\/api\/bot\/client$|^\.\/client$|\/src\/api\/bot\/client\.ts$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const getBackendRobotIdentity=async()=>{const s=globalThis.__registration;s.legacy.push({operation:'identity'});return{account:s.row.state==='existing'?{status:'registered',playerId:1}:{status:'unregistered',playerId:null}}};
 export const invalidateEventBackendRobotIdentity=()=>{};
 export const BackendAPIError=globalThis.__registrationError;
 export const writeContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__registration;s.legacy.push({operation,args});if(s.mode==='current')throw new Error('supplementary API');if(s.row.code==='INVALID_NAME')throw new BackendAPIError(s.row.message,'INVALID_ARGUMENT',400);if(s.row.code==='NAME_TAKEN')throw new BackendAPIError(s.row.message,'CONFLICT',409);if(s.row.code==='LOAD_FAILED')throw new BackendAPIError('write failed','INTERNAL',500);return s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__registration;s.calls.push({operation,args});if(s.row.transport)throw new Error('query failed');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
return await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
}
const handlers=await load('start');
async function run(mode,row,isPrivate=false){
 Object.assign(state,{mode,row,sent:[],calls:[],legacy:[],next:0});
 const e={name:isPrivate?'private.message.create':'message.create',UserId:row.bid,UserName:'测试昵称',GuildId:row.region,ChannelId:'channel',MessageId:'registration',MessageText:row.command,isPrivate};
 await framework.run(handlers[mode], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));return structuredClone(state.sent);
}
test('registration retains feedback and guide actions after explicit gender selection',async()=>{
 for(const row of rows)for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  assert.deepEqual(state.calls,[{operation:'account.register',args:row.arguments}]);
  assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.equal(actual.length,1);
  const text=JSON.stringify(actual);
  if(row.code==='OK') {
   assert.ok(text.includes(row.result.data.data.playerName));
   assert.ok(text.includes('/继续'));assert.ok(text.includes('/跳过引导'));assert.ok(text.includes('跳过剧情'));
  } else if(row.code==='NEED_NAME') {
   assert.ok(text.includes('请输入你的道号'));
  } else if(row.code==='EXISTING_USER') {
   assert.ok(text.includes('/我'));
  } else {
   assert.ok(text.includes(JSON.stringify(row.message).slice(1,-1)),row.state+' '+row.command);
  }
 }
});
test('gender choice offers both roles without creating a character or consuming a card',async()=>{
 const base=rows.find(r=>r.code==='OK');
 for(const isPrivate of [true,false]) {
  const row={...base,command:'/我是 清霜',result:{...base.result,data:{code:'NEED_GENDER',data:{playerName:'清霜'}}}};
  const actual=JSON.stringify(await run('current',row,isPrivate));
  assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);
  assert.ok(actual.includes('/我是 清霜 女'));assert.ok(actual.includes('/我是 清霜 男'));
  assert.ok(!actual.includes('/改性'));assert.ok(!actual.includes('/继续'));
 }
});
test('registration ends on transport or malformed DTO without supplementary APIs',async()=>{
 const ready=rows.find(r=>r.code==='OK');
 for(const data of [null,{},[],{code:['OK'],data:{playerName:'清风'}},{code:'OK',data:{playerName:''}},{code:'INVALID_NAME'}]){
  await run('current',{...ready,result:{...ready.result,data}});assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);
 }
 await run('current',{...ready,transport:true});assert.equal(state.calls.length,1);assert.equal(state.sent.length,1);assert.equal(state.next,0);
});
