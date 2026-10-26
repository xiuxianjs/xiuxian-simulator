import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';


const state = globalThis.__nativeComebackPresentation = { raw:null, sent:[], calls:0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin:{contents:`export {default as overview} from './src/response/comeback/native/res.ts';export {default as claim} from './src/response/comeback/nativeClaim/res.ts';`,resolveDir:process.cwd()},
  bundle:true,write:false,platform:'node',format:'esm',
  plugins:[{name:'referral-presentation-seam',setup(builder){
    builder.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
    builder.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/},args=>({path:args.path,namespace:'seam'}));
    builder.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
    builder.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export class BackendAPIError extends Error{};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__nativeComebackPresentation;s.calls++;if(s.transportError){throw new Error('transport failed')};if(s.failure){await feedback(s.raw);return {handled:true}};return {handled:false,data:decode(s.raw,1)}};` }));
  }}]
});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten=nodes=>nodes.flatMap(node=>Array.isArray(node.value)?flatten(node.value):[node]);
const textOf=nodes=>nodes.map(node=>String(node.value??'')).join('');
const commands=nodes=>nodes.filter(node=>['MD.button','Button'].includes(node.type)).map(node=>node.options.data);
async function render(name,text,raw,failure=false){
  state.raw=raw;state.failure=failure;state.sent=[];state.calls=0;
  const e={name:'message.create',UserId:'player',MessageText:text,isPrivate:true,uid:1};
  await framework.run(handlers[name], e, async()=>{throw new Error('unexpected next')});
  assert.equal(state.calls,1);assert.equal(state.sent.length,1);
  return flatten(state.sent[0]);
}
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessNativeComebackEntryOverviewClaimAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
const receipts=[...output.matchAll(/ROBOT_NATIVE_COMEBACK_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));

test('disabled and inactive comeback overview retain original availability and silence rules',async()=>{
 const rows=receipts.filter(r=>r.op==='native-comeback.overview'&&r.result.success&&!r.result.data.current);assert.ok(rows.length>=3);
 for(const {result:row} of rows){
  const nodes=await render('overview','/回归奖励',row.data),text=textOf(nodes);
  assert.ok(text.includes(row.data.enabled?'当前未触发本服回归活动。':'本服回归活动暂未开启。'));
  if(row.data.enabled){assert.ok(text.includes(`小回归：沉默${row.data.rules.smallSilentDays}天及以上`));assert.ok(text.includes(`大回归：沉默${row.data.rules.largeSilentDays}天及以上`));}
  assert.ok(commands(nodes).includes('/我的信息'));assert.ok(!commands(nodes).includes('/回归签到'));
 }
});
test('active small and large cycles preserve bonus, expiry, ordered days and claim shortcut',async()=>{
 const rows=receipts.filter(r=>r.op==='native-comeback.overview'&&r.result.success&&r.result.data.current);assert.ok(rows.some(r=>r.result.data.current.comebackType==='small'));assert.ok(rows.some(r=>r.result.data.current.comebackType==='large'));
 for(const {result:row} of rows){
  const d=row.data,c=d.current,nodes=await render('overview','/回归奖励',d),text=textOf(nodes);
  for(const part of [`回归类型：${c.comebackTypeText}`,`触发沉默：${c.silentDays}天`,`有效剩余：${c.remainingText}`,`回归加成：修为获取 +${c.expBonusPercent}%`,`周期时长：${d.rules.expireDays}天`,`7日签到（今日第${c.signIn.currentDayIndex}天）`])assert.ok(text.includes(part));
  for(const day of c.signIn.days){assert.ok(text.includes(`第${day.dayIndex}天【${day.statusText}】`));assert.ok(text.includes(day.rewardsPreviewText));}
  assert.equal(commands(nodes).includes('/回归签到'),c.signIn.canClaimToday);assert.ok(commands(nodes).includes('/我的信息'));
 }
});
test('claim receipts preserve granted summaries, day numbers and original navigation',async()=>{
 const rows=receipts.filter(r=>r.op==='native-comeback.claim'&&r.result.success);assert.equal(rows.length,4);
 for(const {result:row} of rows){
  const nodes=await render('claim','/领取回归奖励',row.data),text=textOf(nodes);
  assert.ok(text.includes(row.data.message));for(const reward of row.data.rewardSummary)assert.ok(text.includes(reward));
  assert.ok(commands(nodes).includes('/回归奖励'));assert.ok(commands(nodes).includes('/我的信息'));
 }
});
test('refusals preserve raw server errors and the original overview or claim footer',async()=>{
 const rows=receipts.filter(r=>!r.result.success);assert.ok(rows.some(r=>r.result.middleware.replies.at(-1).text.includes('已领取')));
 for(const {op,result:row} of rows){
  const name=op==='native-comeback.claim'?'claim':'overview',reply=row.middleware.replies.at(-1),nodes=await render(name,name==='claim'?'/领取回归奖励':'/回归奖励',reply,true);
  assert.ok(textOf(nodes).includes(reply.text));assert.ok(commands(nodes).includes('/我的信息'));
  assert.equal(commands(nodes).includes('/回归奖励'),name==='claim');
 }
});
test('transport errors retain original Error messages and stop after one call',async()=>{
 state.transportError=true;
 try{for(const name of ['overview','claim'])assert.ok(textOf(await render(name,name==='claim'?'/领取回归奖励':'/回归奖励',{})).includes('transport failed'));}
 finally{state.transportError=false}
});
test('invalid DTOs keep original parse failure messages without supplementary reads',async()=>{
 assert.ok(textOf(await render('overview','/回归奖励',{})).includes('本服回归响应不完整'));
 assert.ok(textOf(await render('claim','/领取回归奖励',{})).includes('回归签到响应不完整'));
});
