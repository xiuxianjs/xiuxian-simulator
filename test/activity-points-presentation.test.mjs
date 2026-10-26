import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const state=globalThis.__activityPointsPresentation={raw:null,sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as daily} from './src/response/activityPoints/daily/res.ts';export {default as weekly} from './src/response/activityPoints/weekly/res.ts';export {default as claimDaily} from './src/response/activityPoints/claimDaily/res.ts';export {default as claimWeekly} from './src/response/activityPoints/claimWeekly/res.ts';export {default as claimAll} from './src/response/activityPoints/claimAll/res.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'activity-presentation',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export const BackendAPIError=globalThis.__activityPointsBackendAPIError??=class extends Error{constructor(message,code){super(message);this.code=code}};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__activityPointsPresentation;s.calls++;s.op=op;s.args=args;if(s.transport){throw new BackendAPIError('transport failed',s.transport)};if(s.failure){await feedback(s.raw);return {handled:true}};return {handled:false,data:decode(s.raw,1)}};`}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flatten(n.value):[n]);
const textOf=nodes=>nodes.map(n=>String(n.value??'')).join('');
const commands=nodes=>nodes.filter(n=>['MD.button','Button'].includes(n.type)).map(n=>n.options.data);
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessActivityPoints','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const receipts=[...output.matchAll(/ROBOT_ACTIVITY_POINTS_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
async function render(op,raw,failure=false,usage=false){
 const weekly=op.endsWith('weekly'),label=weekly?'周常':'日常',all=op.includes('claim-all'),claim=op.includes('claim'),name=all?'claimAll':claim?weekly?'claimWeekly':'claimDaily':weekly?'weekly':'daily';
 const text=all?`/一键领取${label}活跃奖励`:claim?`/领取${label}活跃奖励${usage?'':' 10'}`:`/${label}活跃`;
 state.raw=raw;state.sent=[];state.calls=0;state.failure=failure;
 await framework.run(handlers[name], {name:'message.create',UserId:'player',MessageText:text,isPrivate:true}, ()=>{throw new Error('unexpected next')});
 assert.equal(state.calls,1);assert.equal(state.op,op);assert.deepEqual(state.args,claim&&!all?usage?{mode:'usage'}:{mode:'claim',requiredPoints:10}:{});assert.equal(state.sent.length,1);
 return flatten(state.sent[0]);
}
test('daily and weekly pages preserve tasks, exact completion, reward status and claim buttons',async()=>{
 for(const row of receipts.filter(r=>r.result.success&&!r.op.includes('claim'))){
  const data=row.result.data,label=row.op.endsWith('weekly')?'周常':'日常',nodes=await render(row.op,data),text=textOf(nodes);
  assert.ok(text.includes(`当前活跃度：${data.currentPoints}`));
  if(!data.tasks.length)assert.ok(text.includes(`暂无${label}任务配置。`));
  for(const task of data.tasks)assert.ok(text.includes(`${task.completed?'◆':'◇'} ${task.name}（${task.currentValue}/${task.targetValue}）+${task.activityPoints}活跃`));
  for(const reward of data.rewards){assert.ok(text.includes(`${reward.claimed?'✅':reward.canClaim?'🔓':'🔒'}${reward.requiredPoints}点 → ${reward.name} x${reward.quantity}`));assert.equal(commands(nodes).includes(`/领取${label}活跃奖励 ${reward.requiredPoints}`),data.rewards.some(r=>r.requiredPoints===reward.requiredPoints&&r.canClaim));}
  assert.equal(commands(nodes).includes(`/一键领取${label}活跃奖励`),data.rewards.some(r=>r.canClaim));assert.ok(commands(nodes).includes('/日常活跃'));assert.ok(commands(nodes).includes('/周常活跃'));
 }
});
test('single claims preserve player, threshold, reward order and navigation',async()=>{
 const rows=receipts.filter(r=>r.result.success&&r.op.includes('.claim-')&&!r.op.includes('claim-all'));assert.equal(rows.length,2);
 for(const row of rows){const data=row.result.data,label=row.op.endsWith('weekly')?'周常':'日常',nodes=await render(row.op,data),text=textOf(nodes);assert.ok(text.includes(`【${data.userName}】领取${label}活跃奖励成功！`));assert.ok(text.includes(`🎯 活跃度阈值：${data.requiredPoints}`));for(const reward of data.issued)assert.ok(text.includes(`${reward.name}×${reward.amount}`));assert.ok(commands(nodes).includes(`/${label}活跃`));}
});
test('all claims preserve complete and partial results with original remaining-error text',async()=>{
 const rows=receipts.filter(r=>r.result.success&&r.op.includes('claim-all'));assert.ok(rows.some(r=>r.result.data.partial));assert.ok(rows.some(r=>!r.result.data.partial));
 for(const row of rows){const data=row.result.data,label=row.op.endsWith('weekly')?'周常':'日常',nodes=await render(row.op,data),text=textOf(nodes);assert.ok(text.includes(data.partial?`已领取部分${label}活跃奖励：`:`【${data.claimed[0].userName}】一键领取${label}活跃奖励成功！`));for(const item of data.claimed){assert.ok(text.includes(`🎯 ${item.requiredPoints}点：`));for(const reward of item.issued)assert.ok(text.includes(`${reward.name}×${reward.amount}`));}if(data.partial&&data.error)assert.ok(text.includes(`剩余奖励领取失败：${data.error}`));assert.ok(commands(nodes).includes(`/${label}活跃`));}
});
test('all refusals and usage keep original text and page-specific return navigation',async()=>{
 for(const row of receipts.filter(r=>!r.result.success)){const reply=row.result.middleware.replies.at(-1),nodes=await render(row.op,reply,true,reply.text.startsWith('请指定活跃度阈值')),label=row.op.endsWith('weekly')?'周常':'日常';assert.ok(textOf(nodes).includes(reply.text));if(row.op.includes('claim'))assert.ok(commands(nodes).includes(`/${label}活跃`));}
});
test('transport and invalid DTO failures stop with original fixed prompts',async()=>{
 for(const op of ['activity-points.daily','activity-points.weekly','activity-points.claim-daily','activity-points.claim-weekly','activity-points.claim-all-daily','activity-points.claim-all-weekly']){
  const label=op.endsWith('weekly')?'周常':'日常',expected=op.includes('claim-all')?'一键领取失败，请稍后再试。':op.includes('claim')?`领取${label}活跃奖励失败，请稍后再试。`:`查看${label}活跃失败，请稍后再试。`;
  state.transport='DISCONNECTED';try{assert.ok(textOf(await render(op,{})).includes(expected));}finally{state.transport=false;}
  assert.ok(textOf(await render(op,{})).includes(expected));
 }
});
test('single claim idempotency busy retains original busy feedback without retries',async()=>{
 state.transport='IDEMPOTENCY_IN_PROGRESS';try{for(const kind of ['daily','weekly'])assert.ok(textOf(await render(`activity-points.claim-${kind}`,{})).includes('操作繁忙，请稍后再试。'));}finally{state.transport=false;}
});
