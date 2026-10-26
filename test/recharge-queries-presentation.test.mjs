import { rechargeBubbleSemantics } from './helpers/recharge-bubble-semantics.mjs';
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
const state=globalThis.__rechargeQueries={};
const framework = createPresentationHarness(state);
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessRechargeQueries','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_RECHARGE_QUERY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,36);
const folders={first:'firstRechargeInfo',newcomer:'newcomerInfo',weekly:'weeklyRebateInfo'};
const contents=Object.entries(folders).map(([kind,folder])=>`export {default as current_${kind}} from './src/response/recharge/${folder}/res.ts';export {default as old_${kind}} from 'old-${kind}';`).join('\n');
const bundle=await build({stdin:{resolveDir:process.cwd(),contents},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'recharge-queries',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/recharge-${a.path}-info-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:resolve('src/response/recharge/'+folders[a.path])}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export { useMessage } from 'alemonjs';
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__rechargeQueries;s.legacy.push({operation,args});if(s.mode==='current')throw new Error('supplementary API');if(s.row.transport||s.row.status!==200)throw new Error('query failed');return s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__rechargeQueries;s.calls.push({operation,args});if(s.row.transport)throw new Error('query failed');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
async function run(mode,row,isPrivate){
 Object.assign(state,{mode,row,sent:[],calls:[],legacy:[],next:0});
 const e={name:isPrivate?'private.message.create':'message.create',UserId:'player',uid:1,MessageId:'recharge-query',MessageText:'查询',isPrivate};
 await framework.run(handlers[mode+'_'+row.kind], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));return state.sent;
}
test('recharge query full bubbles retain original status, quotes, buttons and currency labels',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const privateMessage of [false,true]){
  const actual=await run('current',row,privateMessage);assert.deepEqual(state.calls,[{operation:'recharge.'+row.kind+'-info',args:{}}]);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  assert.deepEqual(rechargeBubbleSemantics(actual,['/充值', '/礼包奖励', '/新人返利', '/周周返利', '/我的资料', '/储物袋', '/我的权益', '/我的订单']),rechargeBubbleSemantics(await run('old',row,privateMessage),['/充值', '/礼包奖励', '/新人返利', '/周周返利', '/我的资料', '/储物袋', '/我的权益', '/我的订单']),row.state+' '+row.kind);assert.equal(state.legacy.length,1);
 }
});
test('only recharge query middleware advances next; malformed DTO and transport errors preserve original failure bubble',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row,false);assert.equal(state.calls.length,1);assert.equal(state.sent.length,0);assert.equal(state.next,1);}
 for(const kind of Object.keys(folders)){
  const ready=rows.find(r=>r.kind===kind&&r.result.success&&r.result.branch==='business');assert.ok(ready);
  for(const transport of [false,true]){
   const row={...ready,transport,v1:{data:{}},result:{...ready.result,data:{}}};
   const actual=await run('current',row,true);assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.deepEqual(rechargeBubbleSemantics(actual,['/充值', '/礼包奖励', '/新人返利', '/周周返利', '/我的资料', '/储物袋', '/我的权益', '/我的订单']),rechargeBubbleSemantics(await run('old',row,true),['/充值', '/礼包奖励', '/新人返利', '/周周返利', '/我的资料', '/储物袋', '/我的权益', '/我的订单']));
  }
 }
});
