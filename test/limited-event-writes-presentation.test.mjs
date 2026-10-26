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
const state=globalThis.__limitedEventWrite={sent:[],calls:[],legacy:[],next:0};
const framework = createPresentationHarness(state);
const kinds=['taskClaim'];
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:kinds.map(kind=>`export {default as current_${kind}} from './src/response/limitedEvent/${kind}/res.ts';export {default as old_${kind}} from 'old-limited-write-${kind}';`).join('\n')},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'limited-event-write',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-limited-write-/},a=>({path:a.path.slice('old-limited-write-'.length),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL('./fixtures/limited-event-'+a.path+'-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/limitedEvent/'+a.path)}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export { useMessage } from 'alemonjs';
 export const writeContext=()=>({});
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__limitedEventWrite;if(s.kind==='current')throw new Error('supplementary API');s.legacy.push({bid,operation,args});if(s.row.status!==200||s.row.transport)throw new Error(s.row.transport?'transport':s.row.message);return s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__limitedEventWrite;s.calls.push({operation,args});if(s.row.transport)throw new Error('transport');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessLimitedEventWrites','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_LIMITED_EVENT_WRITE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,216);
const activeRows=rows.filter(r=>['task-claim'].includes(r.kind));
const kindMap={'task-claim':'taskClaim'};
const operations={'task-claim':'post_players_id_limited_events_tasks_taskId_claim','recharge-claim':'post_players_id_limited_events_recharge_tiers_subActivityId_claim','shop-buy':'post_players_id_limited_events_shop_products_productId_purchase'};
async function run(kind,row,privateMessage){
 Object.assign(state,{kind,row,sent:[],calls:[],legacy:[],next:0});
 const e={name:privateMessage?'private.message.create':'message.create',UserId:'player',uid:1,MessageId:'event-write',MessageText:row.text,isPrivate:privateMessage};
 await framework.run(handlers[kind+'_'+kindMap[row.kind]], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));
 return state.sent;
}
test('remaining limited event writes preserve full original success, refusal and usage bubbles in groups and private messages',async()=>{
 for(const row of activeRows.filter(r=>r.state!=='muted'))for(const privateMessage of [false,true]){
  const actual=await run('current',row,privateMessage);assert.deepEqual(state.calls,[{operation:'limited-event.'+row.kind,args:row.arguments}]);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  assert.deepEqual(actual,await run('old',row,privateMessage),row.state+' '+row.text+' '+privateMessage);
  assert.equal(state.legacy.length,row.status===0?0:1);if(state.legacy.length)assert.equal(state.legacy[0].operation,operations[row.kind]);
 }
});
test('limited event write middleware alone advances next; invalid DTO and transport end without retry or supplementary requests',async()=>{
 for(const row of activeRows.filter(r=>r.state==='muted')){await run('current',row,false);assert.equal(state.next,1);assert.equal(state.calls.length,1);assert.equal(state.sent.length,0);}
 for(const kind of Object.keys(kindMap))for(const transport of [false,true]){
  const original=rows.find(r=>r.kind===kind&&r.state==='ready'&&r.status===200);
  const row={...original,transport,v1:{data:{}},result:{success:true,branch:'business',data:{}}};
  const actual=await run('current',row,true);assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.equal(actual.length,1);
  assert.deepEqual(actual,await run('old',row,true));
 }
});
