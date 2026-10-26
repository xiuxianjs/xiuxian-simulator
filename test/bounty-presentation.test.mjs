import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__bounty={sent:[],calls:0};
const framework = createPresentationHarness(state);
const names=['list','accept','claim'];
const bundle=await build({stdin:{contents:names.map(n=>`export {default as ${n}} from './src/response/bounty/${n}/res.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export {parseRobotBountyList} from './src/api/bot/bounty-queries.ts';export {parseBackendBountyAccept,parseRobotBountyClaim} from './src/api/bot/bounty-actions.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'bounty',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/bounty-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot(?:\/context)?)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/bounty\/[^/]+\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>globalThis.__bounty.app;`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const writeContext=()=>({});export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__bounty;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessBounty(ListsAndClaimBoundaries|AcceptWinLossRollbackAndSlotLost)$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
const rows=[...output.matchAll(/ROBOT_BOUNTY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({name:m[1].split('.')[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=35);
const commands={list:'/悬赏榜',accept:'/接赏',claim:'/领赏'};
async function render(name,text){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate:true};await framework.run(h[name], e, ()=>{state.next++});return state.sent;}
function appResult(row){const r=row.result;if(!r.success){const message=r.middleware.replies.at(-1).text;const code={'悬赏编号无效':'INVALID_ID','你的账号状态异常，无法领赏':'INVALID_USER_STATUS','没有可领取的赏金（未接赏或已领取）':'NOTHING_TO_CLAIM','赏金金额异常':'INVALID_REWARD_AMOUNT'}[message]??'FAIL';return{code,data:{message}};}const d=r.data;if(row.name==='list')return{code:'OK',data:h.parseRobotBountyList(d)};if(row.name==='accept')return{code:'OK',data:h.parseBackendBountyAccept(d)};const claim=h.parseRobotBountyClaim(d);return claim.outcome==='list'?{code:'LIST',data:{pending:claim.pending}}:{code:'OK',data:{rewardAmount:claim.rewardAmount}};}
const leaves=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?leaves(n.value):[n]);
const textOf=nodes=>leaves(nodes).map(n=>typeof n.value==='string'?n.value:'').join('');
const actionsOf=nodes=>leaves(nodes).filter(n=>n.type==='MD.button'||n.type==='Button').map(n=>n.options.data);
test('bounty bubbles preserve real progress, amounts, actions and settlement branches without tutorial footer',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business')){
  state.result=row.result;state.app=appResult(row);const actual=await render(row.name,row.text);
  assert.equal(state.calls,1);assert.equal(state.next,0);assert.deepEqual(state.args,row.args);assert.equal(actual.length,1);
  const text=textOf(actual[0]),actions=actionsOf(actual[0]);
  assert.ok(!actions.includes('/消耗 金盆 1'));
  if(!row.result.success){assert.ok(text.includes(row.result.middleware.replies.at(-1).text));continue;}
  const data=row.result.data;
  if(row.name==='list'){
   const parsed=h.parseRobotBountyList(data);
   for(const item of parsed.list){assert.ok(text.includes(item.targetName));assert.ok(text.includes(`${item.rewardPerCompletion}灵晶/人`));assert.ok(text.includes(`${item.remainingSlots}/${item.maxCompletions}`));assert.ok(text.includes(`剩余${item.hoursLeft}小时`));assert.ok(actions.includes(`/接赏 ${item.id}`));assert.ok(actions.includes(`/查看信息 ${item.targetUid}`));}
   assert.ok(!text.includes('UID:'));
  } else if(row.name==='claim'){
   const parsed=h.parseRobotBountyClaim(data);
   if(parsed.outcome==='list')for(const item of parsed.pending){assert.ok(text.includes(item.targetName));assert.ok(text.includes(`${item.rewardAmount}灵晶`));assert.ok(actions.includes(`/领赏 ${item.bountyId}`));}
   else assert.ok(text.includes(`获得灵晶：${parsed.rewardAmount}`));
  } else {
   if(data.battleWon&&data.completionId){assert.ok(actions.includes(`/领赏 ${row.args.bountyId}`));assert.ok(text.includes('赏金待领取'));}
   else if(data.battleWon){assert.ok(text.includes('元力已退还'));assert.ok(!actions.some(c=>c.startsWith('/领赏 ')));}
   else {assert.ok(text.includes('接赏失败'));assert.ok(!actions.some(c=>c.startsWith('/领赏 ')));}
   assert.ok(!text.includes('赏金来自发布者'));assert.ok(!text.includes('对方身无分文'));
  }
 }
 assert.ok(rows.some(r=>r.name==='accept'&&r.result.data?.battleWon===false));assert.ok(rows.some(r=>r.name==='accept'&&r.result.data?.battleWon===true&&!r.result.data?.completionId));
});
test('bounty admission delegates all local modes; transport and malformed results never retry or next',async()=>{
 const muted=rows.find(r=>r.result.branch==='middleware').result;
 for(const [name,text] of [['list','/悬赏榜'],['accept','/接赏'],['accept','/接赏 1'],['claim','/领赏'],['claim','/领赏 abc'],['claim','/领赏 1']]){state.result=muted;await render(name,text);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render(name,text);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;}
});
