import { goTestFixture } from './helpers/go-fixture.mjs';
import { createTestApp } from 'alemonjs/testing';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {after, test} from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import {build} from 'esbuild';

const state=globalThis.__activityHubPresentation={sent:[],calls:0};
const framework = { result: undefined };
after(async () => { await shutdownLogger(); });
const bundle=await build({stdin:{contents:`export {default as hub} from './src/response/activity/res.ts';export {default as original} from 'old-activity-hub';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'activity-hub-presentation',setup(b){
 b.onResolve({filter:/^old-activity-hub$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/activity-hub-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^axios$/},()=>({path:import.meta.resolve('axios'),external:true}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness|api\/bot\/realm-access-queries|response-apps\/activity\/app)$/},a=>({path:a.path,namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export { useMessage } from 'alemonjs';export default async()=>globalThis.__activityHubPresentation.legacy;export const getBackendRealmAccess=async()=>{const d=globalThis.__activityHubPresentation.result.data;return{moreVisibleCommands:[...(d.newcomerVisible?['/新人狂欢']:[]),...(d.giftCodesVisible?['/礼包码']:[])],foldVisibleCommands:[]}};export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__activityHubPresentation;s.calls++;s.args=args;s.op=op;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};`}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessActivityHub','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const receipts=[...output.matchAll(/ROBOT_ACTIVITY_HUB_RESPONSE=([^|]+)\|(.+)/g)].map(m=>({scenario:m[1],result:JSON.parse(m[2]).data}));
const flatten=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flatten(n.value):[n]);
const textOf=nodes=>flatten(nodes).map(n=>String(n.value??'')).join('');
const commands=nodes=>flatten(nodes).filter(n=>['MD.button','Button'].includes(n.type)).map(n=>n.options.data);
async function render(name='hub',isPrivate=true,command='/我的活动'){
 state.sent=[];state.calls=0;state.next=0;
 const app=createTestApp();
 app.actions.on('message.send',()=>[createResult(ResultCode.Ok,'Test delivery',{id:'activity-hub-receipt'})]);
 try {
  const e={name:isPrivate?'private.message.create':'message.create',UserId:'player',uid:1,MessageText:command,isPrivate};
  framework.result=await app.runHandler(handlers[name],e);
  state.next=framework.result.nextCalls.length;
  state.sent=framework.result.messages.map(message=>message.nodes);
  return state.sent;
 } finally { await app.dispose(); }
}
const entryCommands=nodes=>commands(nodes.find(n=>n.type==='Markdown').value.filter(n=>n.type==='MD.blockquote'));
const expectedCommands=['/日常活跃','/成就','/新人狂欢','/通天塔','/妖塔','/登天梯','/悬赏榜','/劫云榜','/挑战稻草人','/邀请奖励','/珍宝楼','/杀神榜','/人气排行榜'];
const guildCommands=['/宗门日常','/宗门挖矿','/祭祀祖师','/宗门主线','/宗门战备','/灵脉攻防战','/宗门商店'];
async function present(data,isPrivate=true,command='/我的活动'){
 state.result={success:true,branch:'business',data};
 const actual=await render('hub',isPrivate,command);
 assert.equal(state.calls,1);assert.equal(state.op,'activity.hub');assert.deepEqual(state.args,{});assert.equal(state.next,0);assert.equal(actual.length,1);
 assert.equal(framework.result.messages.length,1);
 const message=framework.result.messages[0];
 assert.equal(framework.result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
 assert.deepEqual(entryCommands(actual[0]),command.endsWith('宗门活动')?guildCommands:expectedCommands);
 const header=actual[0].find(n=>n.type==='Markdown').value.filter(n=>n.type==='MD.button');
 assert.deepEqual(header.map(n=>[n.value,n.options.data]),command.endsWith('宗门活动') ? [['‹个人›','/个人活动'],['‹▸宗门›','/宗门活动']] : [['‹▸个人›','/个人活动'],['‹宗门›','/宗门活动']]);
 return actual[0];
}
test('activity center keeps every gameplay entrance visible independently of eligibility and phase',async()=>{
 for(const row of receipts.filter(r=>r.result.success&&r.result.branch==='business'))for(const isPrivate of [false,true]){
  const nodes=await present(row.result.data,isPrivate),text=textOf(nodes);
  assert.ok(text.includes('仙界风云'));
  assert.ok(!text.includes('拍卖'));
  for(const phrase of ['礼包码','返回福利','当前未开启','已封锁','已结束','剩余攻击','产量加成','占领：','参与需','状态暂未确认'])assert.ok(!text.includes(phrase),phrase);
  const quotes=nodes.find(n=>n.type==='Markdown').value.filter(n=>n.type==='MD.blockquote');
  for(const quote of quotes){
   const children=quote.value;
   for(const [i,node] of children.entries())if(node.type==='MD.button'){
    assert.equal(children[i+1]?.type,'MD.text');assert.match(children[i+1].value,/^ — .+/);
   }
  }
 }
});
test('secret realm shows only known valid schedule even outside its open period',async()=>{
 const base=receipts.find(r=>r.scenario==='ready-guild').result.data;
 for(const phase of ['ACTIVE','LOCKED']){
  const data=structuredClone(base);data.guildSecretRealmWar={phase,activeStartAt:'2026-10-17T20:00:00+08:00',activeEndAt:'2026-10-17T21:00:00+08:00',maxAttackPerWeek:5,remainingAttackCount:3,guild:{name:'天庭',outputBonusPct:12.4,occupation:{source:'SETTLED',top:1,high:2,low:3,total:6}}};
  const text=textOf(await present(data,true,'/宗门活动'));assert.ok(text.includes('开放：2026-10-17 20:00:00 ~ 2026-10-17 21:00:00'));
  for(const phrase of ['天庭','12%','S1','3/5','已封锁','争夺中'])assert.ok(!text.includes(phrase));
 }
 for(const [start,end] of [['',''],['invalid','invalid'],['0001-01-01T00:00:00Z','0001-01-01T00:00:00Z'],['2026-10-17T21:00:00+08:00','2026-10-17T20:00:00+08:00']]){
  const data=structuredClone(base);Object.assign(data.guildSecretRealmWar,{activeStartAt:start,activeEndAt:end});
  const text=textOf(await present(data,true,'/宗门活动'));assert.ok(!text.includes('开放：'));assert.ok(!text.includes('时间未知'));assert.ok(!text.includes('0001'));
 }
});
test('activity hub failure matches the original LOAD_FAILED bubble and does not call next',async()=>{
 const row=receipts.find(r=>!r.result.success);state.result=row.result;state.legacy={code:'LOAD_FAILED'};const actual=await render();assert.equal(state.calls,1);assert.equal(state.next,0);assert.ok(textOf(actual[0]).includes('查询活动失败，请稍后再试。'));assert.deepEqual(actual,await render('original'));
});
test('activity hub transport and invalid DTO stay terminal without another request or send',async()=>{
 for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await assert.rejects(()=>render());assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,0);}state.transport=false;
});
test('activity hub middleware result only delegates to the parent fallback',async()=>{
 state.result=receipts.find(r=>r.scenario==='muted').result;await render();assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);
});

test('no guild, old account, locked island and hidden gift codes never hide center entrances',async()=>{
 const base=receipts.find(r=>r.result.success&&r.result.branch==='business').result.data;
 for(const giftCodesVisible of [true,false])for(const isPrivate of [true,false]){
  const nodes=await present({...base,newcomerVisible:false,giftCodesVisible,access:{hasGuild:false,canAccessOverseasIsland:false}},isPrivate);
  assert.deepEqual(entryCommands(nodes),expectedCommands);
 }
});


test('activity aliases preserve quote rows and guild order for group and private messages',async()=>{
 const base=receipts.find(r=>r.result.success&&r.result.branch==='business').result.data;
 for(const isPrivate of [true,false])for(const command of ['/个人活动','/我的活动','/活动大厅','/宗门活动','#宗门活动','！宗门活动']){
  const nodes=await present({...base,access:{hasGuild:false,canAccessOverseasIsland:false}},isPrivate,command);
  const quotes=nodes.find(n=>n.type==='Markdown').value.filter(n=>n.type==='MD.blockquote');
  assert.equal(quotes.length,command.endsWith('宗门活动')?7:13);
  for(const quote of quotes){
   assert.equal(quote.value[0].type,'MD.button');
   assert.equal(quote.value[1].type,'MD.text');
   assert.match(quote.value[1].value,/^ — .+/);
  }
  if(command.endsWith('宗门活动')) assert.deepEqual(quotes.map(q=>q.value[0].value),['‹宗门活跃›','‹宗门挖矿›','‹宗门祭祖›','‹宗门主线›','‹宗门战备›','‹灵脉攻防战›','‹宗门商店›']);
 }
});
