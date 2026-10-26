import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';


const state = globalThis.__referralPresentation = { raw:null, sent:[], calls:0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin:{contents:`export {default as code} from './src/response/referral/viewCode/res.ts';export {default as count} from './src/response/referral/rewardRules/count/res.ts';export {default as realm} from './src/response/referral/rewardRules/realm/res.ts';export {default as vip} from './src/response/referral/rewardRules/vip/res.ts';export {default as invitees} from './src/response/referral/invitees/res.ts';`,resolveDir:process.cwd()},
  bundle:true,write:false,platform:'node',format:'esm',
  plugins:[{name:'referral-presentation-seam',setup(builder){
    builder.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
    builder.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/},args=>({path:args.path,namespace:'seam'}));
    builder.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
    builder.onLoad({filter:/.*/,namespace:'seam'},()=>({resolveDir:process.cwd(),contents:`import { withBusinessRecovery } from ${JSON.stringify(resolve('src/response/businessRecovery.ts'))}; export class BackendAPIError extends Error{};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__referralPresentation;s.calls++;if(s.transportError){throw new Error('transport failed')};if(s.failure){await feedback(withBusinessRecovery(op,s.raw));return {handled:true}};return {handled:false,data:decode(s.raw,1)}};` }));
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
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessReferralQueriesSyncReadProjectionAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
const receipts=[...output.matchAll(/ROBOT_REFERRAL_QUERY_RESPONSE=([^|]+)\|([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
const names={'referral.code':'code','referral.rules-count':'count','referral.rules-realm':'realm','referral.rules-vip':'vip','referral.invitees':'invitees'};
const texts={code:'/邀请码',count:'/邀请人数奖励',realm:'/邀请境界奖励',vip:'/邀请VIP奖励'};

test('referral code keeps original invite count, unlimited label, pending amount and shortcuts',async()=>{
  for(const {result:row} of receipts.filter(r=>r.op==='referral.code'&&r.result.success)){
    const d=row.data,nodes=await render('code',texts.code,d),text=textOf(nodes);
    assert.ok(text.includes(`我的邀请码：${d.code}`));
    assert.ok(text.includes(`累计邀请：${d.inviteCount} 人`));
    assert.ok(text.includes('邀请人数无上限'));
    assert.ok(text.includes(`/绑定邀请码 ${d.code}`));
    for(const command of ['/我的邀请','/邀请人数奖励','/邀请VIP奖励','/邀请境界奖励'])assert.ok(commands(nodes).includes(command));
    assert.equal(commands(nodes).includes('/领取邀请奖励'),d.pendingRewards>0);
    if(d.pendingRewards>0)assert.ok(text.includes(`待领取奖励：${d.pendingRewards}条`));
  }
});
test('all rule pages retain ordered thresholds, eligibility tags and original snapshot text',async()=>{
  for(const {op,result:row} of receipts.filter(r=>r.op.startsWith('referral.rules-')&&r.result.success)){
    const name=names[op],kind=name==='realm'?'realm_level':name==='vip'?'vip_level':'count';
    const panel=row.data.rulePanels[kind],nodes=await render(name,texts[name],row.data),text=textOf(nodes);
    assert.ok(text.includes(`已邀请人数：${row.data.inviteCount}人`));
    let previous=-1;
    for(const group of panel.groups){
      const index=text.indexOf(group.threshold);assert.ok(index>previous);previous=index;
      assert.ok(text.includes(group.tag));assert.ok(text.includes(group.icon));
      for(const reward of group.rewards)assert.ok(text.includes(reward));
    }
    if(!panel.groups.length)assert.ok(text.includes('暂无'));
    assert.ok(commands(nodes).includes('/邀请码'));assert.equal(commands(nodes).includes('/领取邀请奖励'),panel.pendingCount>0);
  }
});
test('invitee pages retain names, eligibility, next goals, empty states and per-player buttons',async()=>{
  for(const {args,result:row} of receipts.filter(r=>r.op==='referral.invitees'&&r.result.success)){
    const d=row.data,nodes=await render('invitees',`/我的邀请 ${args.page}`,d),text=textOf(nodes);
    assert.ok(text.includes(`我邀请的道友：${d.total} 人`));
    for(const item of d.items){
      assert.ok(text.includes(`${item.name} · UID ${item.userId}`));assert.ok(text.includes(item.realmName));
      assert.ok(text.includes(`待领取 ${item.pendingRewards} 条 · 已领取 ${item.claimedRewards} 条`));
      for(const reward of [item.nextRealmReward,item.nextVipReward].filter(Boolean)){
        assert.ok(text.includes(reward.goal));for(const line of reward.rewards)assert.ok(text.includes(line));
      }
      assert.ok(commands(nodes).includes(`/查看信息 ${item.userId}`));assert.ok(commands(nodes).includes(`/邀请入队 ${item.userId}`));
    }
    if(!d.items.length)assert.ok(text.includes(d.total===0?'还没有道友绑定你的邀请码':'这一页没有道友'));
    assert.equal(commands(nodes).includes(`/我的邀请 ${args.page-1}`),args.page>1);
    assert.equal(commands(nodes).includes('/领取邀请奖励'),d.items.some(item=>item.pendingRewards>0));
  }
});
test('referral refusals retain fixed panel errors and original safe invitee errors without success content',async()=>{
  for(const {op,args,result:row} of receipts.filter(r=>!r.result.success)){
    const name=names[op],reply=row.middleware.replies.at(-1);
    const nodes=await render(name,name==='invitees'?`/我的邀请 ${args.page??0}`:texts[name],reply,true);
    assert.ok(textOf(nodes).includes(reply.text));assert.ok(!textOf(nodes).includes('我的邀请码：'));
    if(name!=='invitees')assert.ok(!commands(nodes).includes('/领取邀请奖励'));
  }
});
test('all five direct handlers stop on transport failure using original failure bubbles',async()=>{
  state.transportError=true;
  try{
    for(const name of Object.values(names)){
      const nodes=await render(name,name==='invitees'?'/我的邀请':texts[name],{});
      assert.ok(textOf(nodes).includes(name==='code'?'查询邀请码信息失败，请稍后再试':name==='invitees'?'服务暂时不可用，请稍后再试':'查询失败，请稍后再试'));
    }
  }finally{state.transportError=false}
});
test('invalid business DTOs stop locally without supplementary reads',async()=>{
  for(const name of Object.values(names)){
    const nodes=await render(name,name==='invitees'?'/我的邀请':texts[name],{});
    assert.ok(textOf(nodes).includes(name==='code'?'查询邀请码信息失败':name==='invitees'?'服务暂时不可用':'查询失败'));
  }
});
