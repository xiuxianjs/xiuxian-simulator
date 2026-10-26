import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';


const state=globalThis.__membershipClaimPresentation={raw:null,sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({
 entryPoints:['src/response/monthCard/claim/res.ts'],bundle:true,write:false,platform:'node',format:'esm',
 plugins:[{name:'membership-claim-seam',setup(builder){
  builder.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
  builder.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/},args=>({path:args.path,namespace:'seam'}));
  builder.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
  builder.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export class BackendAPIError extends Error{};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__membershipClaimPresentation;s.calls++;s.op=op;s.args=args;if(s.transportError){throw new Error('transport failed')};if(s.failure){await feedback(s.raw);return {handled:true}};return {handled:false,data:decode(s.raw,1)}};`}));
 }}]
});
const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flatten(n.value):[n]);
const textOf=nodes=>nodes.map(n=>String(n.value??'')).join('');
const commands=nodes=>nodes.filter(n=>['MD.button','Button'].includes(n.type)).map(n=>n.options.data);
async function render(raw,failure=false){
 state.raw=raw;state.failure=failure;state.sent=[];state.calls=0;
 const e={name:'message.create',UserId:'player',MessageText:'/一键领取月卡',isPrivate:true};
 await framework.run(handler, e, ()=>{throw new Error('unexpected next')});
 assert.equal(state.calls,1);assert.equal(state.op,'membership.claim-month-card');assert.deepEqual(state.args,{});assert.equal(state.sent.length,1);
 return flatten(state.sent[0]);
}
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessMembership','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
const rows=[...output.matchAll(/ROBOT_MEMBERSHIP_RESPONSE=membership.claim-month-card\|player\|(.+)/g)].map(m=>JSON.parse(m[1]).data);
const refusals=rows.filter(r=>!r.success).map(r=>r.middleware.replies.at(-1));
test('month card successful claims preserve granted amounts, progress and original return button',async()=>{
 const receipts=rows.filter(r=>r.success);assert.equal(receipts.length,2);
 for(const row of receipts){const nodes=await render(row.data),text=textOf(nodes),{claim,status}=row.data;
  for(const part of [`已领取 ${claim.days} 天奖励`,`灵晶 ×${claim.rewards.spiritCrystal}`,`精力丹 ×${claim.rewards.mentalPill}`,`元力丹 ×${claim.rewards.qiPill}`,`累计已领 ${status.claimedCount} 天`,`后续 ${status.upcomingCount} 天`])assert.ok(text.includes(part));
  assert.ok(commands(nodes).includes('/我的权益'));
 }
});
test('inactive month card states the reason without repeat-command banter',async()=>{
 const replies=refusals.filter(r=>r.text.includes('尚未开通月卡'));assert.equal(replies.length,6);assert.ok(replies.some(r=>r.text.includes('道友，你是来找我玩的吗')));
 for(const reply of replies){const nodes=await render(reply,true);assert.ok(textOf(nodes).includes('月卡未生效。'));assert.ok(!textOf(nodes).includes('找我玩'));assert.ok(commands(nodes).includes('/我的权益'));assert.ok(commands(nodes).includes('/我的权益 月卡'));}
});
test('no rewards gives a concise reason and keeps the view action for every refusal',async()=>{
 const replies=refusals.filter(r=>r.heading==='📅 月卡每日奖励');assert.equal(replies.length,9);
 for(const reply of replies){const nodes=await render(reply,true),text=textOf(nodes);assert.ok(text.includes('今日暂无可领。'));assert.ok(!text.includes('每天有新的奖励到账'));assert.ok(!text.includes('道友，你是来找我玩的吗'));assert.ok(commands(nodes).includes('/我的权益'));}
});
test('rollback and post-commit read failures both lead to viewing the uncertain result',async()=>{
 const replies=refusals.filter(r=>r.text==='领取失败，请稍后再试或联系运营。');assert.equal(replies.length,2);
 for(const reply of replies){const nodes=await render(reply,true);assert.ok(textOf(nodes).includes('领取结果待确认，请查看月卡奖励。'));assert.ok(commands(nodes).includes('/我的权益 月卡'));}
});
test('transport and invalid receipts stop after one call and lead to viewing',async()=>{
 state.transportError=true;
 try{assert.ok(textOf(await render({})).includes('领取结果待确认，请查看月卡奖励。'));}finally{state.transportError=false;}
 for(const raw of [{},{beforeTotal:0,claim:null,status:null},{beforeTotal:1,claim:null,status:null}]){
  const nodes=await render(raw);assert.ok(textOf(nodes).includes('领取结果待确认，请查看月卡奖励。'));assert.ok(commands(nodes).includes('/我的权益'));
 }
});
