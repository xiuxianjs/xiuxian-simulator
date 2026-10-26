import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';


const state = globalThis.__referralActionsPresentation = { raw:null, sent:[], calls:0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin:{contents:`export {default as bind} from './src/response/referral/bindCode/res.ts';export {default as claim} from './src/response/referral/claimReward/res.ts';`,resolveDir:process.cwd()},
  bundle:true,write:false,platform:'node',format:'esm',
  plugins:[{name:'referral-presentation-seam',setup(builder){
    builder.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
    builder.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/},args=>({path:args.path,namespace:'seam'}));
    builder.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
    builder.onLoad({filter:/.*/,namespace:'seam'},()=>({resolveDir:process.cwd(),contents:`import { withBusinessRecovery } from ${JSON.stringify(resolve('src/response/businessRecovery.ts'))}; export class BackendAPIError extends Error{};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__referralActionsPresentation;s.calls++;if(s.transportError){throw new Error('transport failed')};if(s.failure){await feedback(withBusinessRecovery(op,s.raw));return {handled:true}};return {handled:false,data:decode(s.raw,1)}};` }));
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
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessReferralActionsRewardsRollbackRepeatAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
const receipts=[...output.matchAll(/ROBOT_REFERRAL_ACTION_RESPONSE=([^|]+)\|([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));

test('missing binding code keeps original input guide after one admission request',async()=>{
 const row=receipts.find(r=>r.op==='referral.bind'&&r.result.success&&r.result.data.outcome==='usage');assert.ok(row);
 const nodes=await render('bind','/绑定邀请码',row.result.data);
 assert.ok(textOf(nodes).includes('请输入邀请码'));assert.ok(textOf(nodes).includes('格式：/绑定邀请码 tt-用户ID'));
 assert.ok(commands(nodes).includes('/邀请码'));
});
test('binding success keeps original currency/item summary and empty-gift success navigation',async()=>{
 const rows=receipts.filter(r=>r.op==='referral.bind'&&r.result.success&&r.result.data.outcome==='result');assert.equal(rows.length,2);
 for(const {result:row} of rows){
  const nodes=await render('bind','/绑定邀请码 tt-2',row.data);
  assert.ok(textOf(nodes).includes(row.data.message));assert.ok(commands(nodes).includes('/邀请码'));
  assert.equal(textOf(nodes).includes('获得奖励：'),row.data.data.issued.length>0);
 }
});
test('binding refusals retain mapped messages and repeated prompts with cause-specific navigation',async()=>{
 const rows=receipts.filter(r=>r.op==='referral.bind'&&!r.result.success);assert.ok(rows.some(r=>r.result.middleware.replies.at(-1).text.includes('道友，你是来找我玩的吗')));
 for(const {result:row} of rows){
  const reply=row.middleware.replies.at(-1),nodes=await render('bind','/绑定邀请码 tt-2',reply,true);
  assert.ok(textOf(nodes).includes(reply.text));assert.ok(commands(nodes).includes('/邀请码')||commands(nodes).includes('/我的信息'));
  assert.ok(!commands(nodes).some(command=>/^\/绑定邀请码\s/.test(command)));
 }
});
test('claim success renders only original authoritative issued rewards and keeps referral navigation',async()=>{
 const row=receipts.find(r=>r.op==='referral.claim'&&r.result.success);assert.ok(row);
 const nodes=await render('claim','/领取邀请奖励',row.result.data),text=textOf(nodes);
 assert.ok(text.includes('成功领取 2 条邀请奖励'));assert.ok(text.includes('灵石 ×11'));assert.ok(text.includes('药草 ×2'));
 assert.ok(!text.includes('×99'));assert.ok(commands(nodes).includes('/邀请码'));
});
test('claim refusals preserve no-reward, transaction and snapshot errors with repeated prompt and footer',async()=>{
 const rows=receipts.filter(r=>r.op==='referral.claim'&&!r.result.success);assert.ok(rows.some(r=>r.result.middleware.replies.at(-1).text.includes('旧奖励缺少可恢复快照')));assert.ok(rows.some(r=>r.result.middleware.replies.at(-1).text.includes('已达成奖励快照异常')));
 for(const {result:row} of rows){
  const reply=row.middleware.replies.at(-1),nodes=await render('claim','/领取邀请奖励',reply,true);
  assert.ok(textOf(nodes).includes(reply.text));assert.ok(commands(nodes).includes('/邀请码'));
 }
});
test('both writes end on transport failure with original generic errors and no repeat API',async()=>{
 state.transportError=true;
 try{
  for(const [name,text,error] of [['bind','/绑定邀请码 tt-2','绑定失败，请稍后再试'],['claim','/领取邀请奖励','领取失败，请稍后再试']]){
   assert.ok(textOf(await render(name,text,{})).includes(error));
  }
 }finally{state.transportError=false}
});
test('invalid grant receipts stop without claiming success or querying another API',async()=>{
 for(const [name,text] of [['bind','/绑定邀请码 tt-2'],['claim','/领取邀请奖励']]){
  const nodes=await render(name,text,{outcome:'result',message:'invalid success',data:{claimed:1,issued:[{type:'currency',name:'灵石',amount:0}]}});
  assert.ok(textOf(nodes).includes(name==='bind'?'绑定失败':'领取失败'));assert.ok(!textOf(nodes).includes('invalid success'));
 }
});
