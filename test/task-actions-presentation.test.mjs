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
const state=globalThis.__taskActions={};
const framework = createPresentationHarness(state);
globalThis.__taskActionsError=class BackendAPIError extends Error {constructor(message,code,status){super(message);this.code=code;this.status=status}};
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessTaskActions','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_TASK_ACTIONS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,65);
async function load(flow){
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {default as current} from './src/response/task/${flow}/res.ts';export {default as old} from 'old-catalog';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'catalog',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-catalog$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/tasks-${flow}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:resolve('src/response/task/'+flow)}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/api$/},()=>({path:'api',namespace:'barrel'}));
 b.onLoad({filter:/.*/,namespace:'barrel'},()=>({resolveDir:process.cwd(),contents:`export {issueBackendLoginWindow} from ${JSON.stringify(resolve('src/api/bot/account.ts'))};export {createBackendRequestContext} from ${JSON.stringify(resolve('src/api/bot/context.ts'))};export {BackendAPIError} from ${JSON.stringify(resolve('src/api/bot/client.ts'))};`}));
 b.onResolve({filter:/^@src\/api\/bot\/identity$/},()=>({path:'identity',namespace:'seam'}));
 b.onResolve({filter:/^\.\/useMessage$/},()=>({path:'message',namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$|\/src\/api\/bot\/client\.ts$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const getBackendRobotIdentity=async()=>({account:{status:'registered',playerId:1}});
 export const BackendAPIError=globalThis.__taskActionsError;
 export const writeContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__taskActions;s.legacy.push({operation,args});if(s.mode==='current')throw new Error('supplementary API');if(s.row.transport)throw new BackendAPIError('query failed','SDK_NETWORK_ERROR');if(s.row.status!==200)throw new BackendAPIError(s.row.v1?.error?.message??'legacy error',s.row.v1?.error?.code??'SDK_INVALID_RESPONSE',s.row.status);return operation==='get_robot_realm_access'?s.row.access:s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__taskActions;s.calls.push({operation,args});if(s.row.transport)throw new Error('query failed');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
return await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
}
const handlers={'tasks.cancel':await load('cancel'),'tasks.skip':await load('skip'),'tasks.start':await load('execute')};
async function run(mode,row){
 Object.assign(state,{mode,row,sent:[],calls:[],legacy:[],next:0});
 const e={name:row.private?'private.message.create':'message.create',UserId:'player',uid:1,MessageId:'catalog',MessageText:row.command,__route:{params:{slot:row.slot}},isPrivate:row.private};
 await framework.invoke(e, ()=>handlers[row.operation][mode](e,()=>state.next++), ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));return state.sent;
}
test('start skip and cancel retain complete original bubbles and silent completion with one business call',async()=>{
 for(const row of rows.filter(r=>r.status===200&&!['muted','unregistered'].includes(r.state))){
  const actual=await run('current',row);assert.deepEqual(state.calls,[{operation:row.operation,args:row.arguments}]);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  assert.deepEqual(actual,await run('old',row),row.operation+' '+row.slot+' '+row.state);assert.equal(state.legacy.length,1);
 }
});
test('only admission middleware advances next; request and DTO failures end with task feedback',async()=>{
 for(const row of rows.filter(r=>['muted','unregistered'].includes(r.state))){await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.sent.length,0);assert.equal(state.next,1);}
 for(const row of rows.filter(r=>r.status!==200&&r.state!=='unregistered'&&r.state!=='muted')){await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.sent.length,1);assert.equal(state.next,0);}
 for(const operation of ['tasks.start','tasks.skip','tasks.cancel']){
  const ready=rows.find(r=>r.operation===operation&&r.result.success&&r.result.branch==='business');
  for(const data of [null,{},[],operation==='tasks.skip'?{outcome:'not_running'}:operation==='tasks.cancel'?{cleared:false}:{outcome:'not_running'}]){
   await run('current',{...ready,result:{...ready.result,data}});assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);
  }
  await run('current',{...ready,transport:true});assert.equal(state.calls.length,1);assert.equal(state.sent.length,1);assert.equal(state.next,0);
 }
});
