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
const state=globalThis.__weeklyClaim={};
const framework = createPresentationHarness(state);
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessWeeklyRebateClaim','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_WEEKLY_REBATE_CLAIM=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,154);
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {default as current} from './src/response/recharge/weeklyRebateClaim/res.ts';export {default as old} from 'old-weekly-claim';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'weekly-claim',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-weekly-claim$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/weekly-rebate-claim-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/recharge/weeklyRebateClaim')}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const writeContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__weeklyClaim;s.legacy.push({operation,args});if(s.kind==='current')throw new Error('supplementary API');if(s.row.transport)throw new Error('测试传输失败');if(s.row.status!==200)throw new Error(s.row.message);return s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__weeklyClaim;s.calls.push({operation,args});if(s.row.transport)throw new Error('测试传输失败');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
async function run(kind,row,privateMessage){
 Object.assign(state,{kind,row,sent:[],calls:[],legacy:[],next:0});
 const e={name:privateMessage?'private.message.create':'message.create',UserId:'player',uid:1,MessageId:'weekly-claim',MessageText:row.input,isPrivate:privateMessage};
 await framework.run(handlers[kind], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));
 return state.sent;
}
test('weekly claim preserves all original complete bubbles, current weekday and attendance labels',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const privateMessage of [false,true]){
  const actual=await run('current',row,privateMessage);assert.deepEqual(state.calls,[{operation:'recharge.weekly-rebate-claim',args:row.arguments}]);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  assert.deepEqual(rechargeBubbleSemantics(actual,['/充值', '/礼包奖励', '/新人返利', '/周周返利', '/我的资料', '/储物袋', '/我的权益', '/我的订单']),rechargeBubbleSemantics(await run('old',row,privateMessage),['/充值', '/礼包奖励', '/新人返利', '/周周返利', '/我的资料', '/储物袋', '/我的权益', '/我的订单']),row.state+' '+row.input);assert.equal(state.legacy.length,row.status===0?0:1);
  if(state.legacy.length)assert.equal(state.legacy[0].operation,'post_players_id_recharge_weekly_rebate_dayIndex_claim');
 }
});
test('weekly claim only middleware advances next; empty rewards, malformed DTO and transport errors retain original presentation',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row,false);assert.equal(state.calls.length,1);assert.equal(state.sent.length,0);assert.equal(state.next,1);}
 const ready=rows.find(r=>r.state==='ready'&&r.status===200);
 for(const variant of ['empty','malformed','transport']){
  const data=variant==='empty'?{...ready.result.data,issued:[]}:{};
  const row={...ready,transport:variant==='transport',v1:{data},result:{...ready.result,data}};
  const actual=await run('current',row,true);assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.deepEqual(rechargeBubbleSemantics(actual,['/充值', '/礼包奖励', '/新人返利', '/周周返利', '/我的资料', '/储物袋', '/我的权益', '/我的订单']),rechargeBubbleSemantics(await run('old',row,true),['/充值', '/礼包奖励', '/新人返利', '/周周返利', '/我的资料', '/储物袋', '/我的权益', '/我的订单']));
 }
});
