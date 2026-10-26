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
const state=globalThis.__tasksOverview={};
const framework = createPresentationHarness(state);
globalThis.__tasksOverviewError=class BackendAPIError extends Error {constructor(message,code,status){super(message);this.code=code;this.status=status}};
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessTasksOverview','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_TASKS_OVERVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,13);
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {default as current} from './src/response/task/overview/res.ts';export {default as old} from 'old-catalog';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'catalog',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-catalog$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/tasks-overview-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/task/overview')}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/api$/},()=>({path:'api',namespace:'barrel'}));
 b.onLoad({filter:/.*/,namespace:'barrel'},()=>({resolveDir:process.cwd(),contents:`export {issueBackendLoginWindow} from ${JSON.stringify(resolve('src/api/bot/account.ts'))};export {createBackendRequestContext} from ${JSON.stringify(resolve('src/api/bot/context.ts'))};export {BackendAPIError} from ${JSON.stringify(resolve('src/api/bot/client.ts'))};`}));
 b.onResolve({filter:/^@src\/api\/bot\/identity$/},()=>({path:'identity',namespace:'seam'}));
 b.onResolve({filter:/^\.\/useMessage$/},()=>({path:'message',namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$|\/src\/api\/bot\/client\.ts$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const getBackendRobotIdentity=async()=>({account:{status:'registered',playerId:1}});
 export const BackendAPIError=globalThis.__tasksOverviewError;
 export const writeContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__tasksOverview;s.legacy.push({operation,args});if(s.mode==='current')throw new Error('supplementary API');if(s.row.transport)throw new BackendAPIError('query failed','SDK_NETWORK_ERROR');if(s.row.status!==200)throw new BackendAPIError(s.row.v1?.error?.message??'legacy error',s.row.v1?.error?.code??'SDK_INVALID_RESPONSE',s.row.status);return operation==='get_robot_realm_access'?s.row.access:s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__tasksOverview;s.calls.push({operation,args});if(s.row.transport)throw new Error('query failed');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
async function run(mode,row){
 Object.assign(state,{mode,row,sent:[],calls:[],legacy:[],next:0});
 const e={name:row.private?'private.message.create':'message.create',UserId:'player',uid:1,MessageId:'catalog',MessageText:'/任务',isPrivate:row.private};
 await framework.invoke(e, ()=>handlers[mode](e,()=>state.next++), ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));return state.sent;
}
test('task overview retains full editor and running-task shortcuts without supplemental APIs',async()=>{
 for(const row of rows.filter(r=>r.status===200&&!['muted','unregistered'].includes(r.state))){
  const actual=await run('current',row);assert.deepEqual(state.calls,[{operation:'tasks.overview',args:{}}]);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  assert.deepEqual(actual,await run('old',row),row.state);assert.equal(state.legacy.length,1);
 }
});
test('only middleware advances next; service and DTO failures end with task feedback',async()=>{
 for(const row of rows.filter(r=>['muted','unregistered'].includes(r.state))){await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.sent.length,0);assert.equal(state.next,1);}
 for(const row of rows.filter(r=>r.status!==200&&r.state!=='unregistered')){await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.sent.length,1);assert.equal(state.next,0);}
 const ready=rows.find(r=>r.state==='empty');
 for(const data of [null,{},[],{outcome:'not_running'},{outcome:'current',command:'签到',slot:999}]){
  await run('current',{...ready,result:{...ready.result,data}});assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);
 }
 await run('current',{...ready,transport:true});assert.equal(state.calls.length,1);assert.equal(state.sent.length,1);assert.equal(state.next,0);
});
