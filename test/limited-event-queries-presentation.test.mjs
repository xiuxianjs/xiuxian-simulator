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
const state=globalThis.__limitedEventQuery={sent:[],calls:[],legacy:[],next:0};
const framework = createPresentationHarness(state);
const kinds=['overview','tasks','tokens'];
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:kinds.map(kind=>`export {default as current_${kind}} from './src/response/limitedEvent/${kind}/res.ts';export {default as old_${kind}} from 'old-limited-event-${kind}';`).join('\n')},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'limited-event-query',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-limited-event-/},a=>({path:a.path.slice('old-limited-event-'.length),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL('./fixtures/limited-event-'+a.path+'-before-v2.ts.txt',import.meta.url),'utf8').replace('（充值获得）',''),resolveDir:resolve('src/response/limitedEvent/'+a.path)}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export { useMessage } from 'alemonjs';
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__limitedEventQuery;if(s.kind==='current')throw new Error('supplementary API');s.legacy.push({bid,operation,args});if(s.row.status!==200||s.row.transport)throw new Error('legacy failure');return s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__limitedEventQuery;s.calls.push({operation,args});if(s.row.transport)throw new Error('transport');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessLimitedEventQueries','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_LIMITED_EVENT_QUERY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,140);
const activeRows=rows.filter(r=>['overview','tasks','tokens'].includes(r.kind));
const operations={overview:'get_players_id_limited_events',shop:'get_players_id_limited_events_shop_products',recharge:'get_players_id_limited_events_recharge_packages',tasks:'get_players_id_limited_events_tasks',tokens:'get_players_id_limited_events_tokens'};
async function run(kind,row){
 Object.assign(state,{kind,row,sent:[],calls:[],legacy:[],next:0});
 const e={name:row.private?'private.message.create':'message.create',UserId:'player',uid:1,MessageId:'event-view',MessageText:row.text,isPrivate:row.private};
 await framework.run(handlers[kind+'_'+row.kind], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));
 return state.sent;
}
test('remaining limited event query views preserve complete original success, empty, refusal and privacy bubbles',async()=>{
 for(const row of activeRows.filter(r=>r.state!=='muted')){
  const actual=await run('current',row);assert.deepEqual(state.calls,[{operation:'limited-event.'+row.kind,args:row.arguments}]);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  assert.deepEqual(actual,await run('old',row),row.state+' '+row.text+' '+row.private);
  assert.equal(state.legacy.length,row.kind==='recharge'&&!row.private?0:1);
  if(state.legacy.length){const call=state.legacy[0];assert.equal(call.operation,operations[row.kind]);assert.deepEqual(call.args.path,{id:1});if(row.kind==='shop')assert.deepEqual(call.args.query,{shopType:row.arguments.shopType});}
 }
});
test('limited event middleware advances parent next; malformed DTO and transport failures end without a fallback request',async()=>{
 for(const row of activeRows.filter(r=>r.state==='muted')){await run('current',row);assert.equal(state.next,1);assert.equal(state.calls.length,1);assert.equal(state.sent.length,0);}
 for(const kind of kinds)for(const transport of [false,true]){
  const original=rows.find(r=>r.kind===kind&&r.private&&r.state==='ready');
  const row={...original,transport,v1:{data:{}},result:{success:true,branch:'business',data:{}}};
  const actual=await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.equal(actual.length,1);
  assert.deepEqual(actual,await run('old',row));
 }
});
