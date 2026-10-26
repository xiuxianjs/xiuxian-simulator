import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { parseBlackBoxRoom, parseBlackBoxOverview } from '../../src/api/schemas/black-box';
import { businessEnvelope, gameFixture } from './fixture';

const previews: Record<string, {text:string;commands:string[]}> = {};
let scratch:string;
let frames:Record<string,unknown>;
let paid:Record<string,unknown>;
let welfareOverview:unknown;
let clickFrames:Record<string,unknown>;
let cancelledRoom:unknown;
before(()=>{
 scratch=mkdtempSync(join(tmpdir(),'black-box-bot-contracts-'));
 try { goTestFixture(['test','./internal/httpapi','-run','^TestBlackBoxHTTP','-count=1'],{cwd:fileURLToPath(new URL('../../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',env:{...process.env,BLACK_BOX_HTTP_CONTRACT_OUTPUT:join(scratch,'black-box-contracts.json')},maxBuffer:4*1024*1024}); } catch (error) { const failure=error as {stdout?:Buffer;stderr?:Buffer}; throw Error(`${failure.stdout?.toString()??''}${failure.stderr?.toString()??''}`); }
 frames=JSON.parse(readFileSync(join(scratch,'black-box-contracts.json'),'utf8'));
 paid=JSON.parse(readFileSync(join(scratch,'black-box-paid-contracts.json'),'utf8'));
 welfareOverview=JSON.parse(readFileSync(join(scratch,'black-box-test-welfare-contract.json'),'utf8'));
 cancelledRoom=JSON.parse(readFileSync(join(scratch,'black-box-cancellation-contract.json'),'utf8'));
 clickFrames=JSON.parse(readFileSync(join(scratch,'black-box-click-window-contract.json'),'utf8'));
 mock.timers.enable({apis:['setTimeout']});
});
after(async()=>{if(process.env.BLACK_BOX_QQ_PREVIEW_OUTPUT)writeFileSync(process.env.BLACK_BOX_QQ_PREVIEW_OUTPUT,JSON.stringify(previews,null,2));mock.timers.reset();if(scratch)rmSync(scratch,{recursive:true,force:true});await shutdownLogger();});
function quotes(nodes:NonNullable<Parameters<typeof inspectMessage>[0]>) {
 return nodes.flatMap(n=>n.type==='Markdown'?n.value.filter(c=>c.type==='MD.blockquote'):[]).map(q=>{
  if(q.type!=='MD.blockquote'||!Array.isArray(q.value))throw Error('Expected structured quote');
  return inspectMessage([{type:'Markdown',value:q.value}]);
 });
}
async function mountBlackBox(app: Awaited<ReturnType<typeof gameFixture>>['app']) {
 const router=Router.create({events:['message.create','private.message.create']});
 router.use(['黑盒拍卖', '限时活动', '查看特殊活动'], () => import('@src/response/blackBox/overview/res'));
 router.use('黑盒排期', () => import('@src/response/blackBox/schedule/res'));
 router.use('黑盒记录', () => import('@src/response/blackBox/history/res'));
 router.use('黑盒详情', () => import('@src/response/blackBox/room/res'));
 router.use('黑盒出价', () => import('@src/response/blackBox/preview/res'));
 router.use('黑盒入场', () => import('@src/response/blackBox/join/res'));
 router.use(['黑盒提醒', '黑盒预约'], () => import('@src/response/blackBox/reserve/res'));
 router.use('黑盒确认', () => import('@src/response/blackBox/confirm/res'));
 router.use('黑盒取消', () => import('@src/response/blackBox/cancel/res'));
 router.use('黑盒鉴宝', () => import('@src/response/blackBox/probe/res'));
 router.use('确认黑盒出价', () => import('@src/response/blackBox/bid/res'));
 router.use('黑盒撤标', () => import('@src/response/blackBox/withdraw/res'));
 await app.mount({responseRouter:router.define});
}
async function run(t:Parameters<typeof gameFixture>[0],text:string,data:unknown,privateChat=true){
 const f=await gameFixture(t,r=>businessEnvelope(r.bid,data));
 await mountBlackBox(f.app);
 const event=privateChat?f.app.events.privateMessage({text,platform:'qq-bot'}):f.app.events.groupMessage({text,platform:'qq-bot'});
 const result=await f.app.dispatch(event);
 assert.equal(result.messages.length,1);
 const m=result.messages[0];assert.equal(result.actions[m.actionIndex].results?.[0].code,ResultCode.Ok);
 previews[`${privateChat?'private':'group'}:${text}`]={text:m.text,commands:m.commands};
 return {...f,result,message:m};
}
test('私聊今日选房只展示当天公开线索，币种底价与预约操作同块',async t=>{
 const {requests,message}=await run(t,'/黑盒排期 12',frames.overviewReserved);
 assert.equal(requests.length,1);assert.equal(requests[0].path,'/api/v2/robot/business/black-box.overview');assert.ok(requests[0].idempotencyKey);
 const rooms=quotes(message.nodes).filter(q=>q.commands.some(c=>c.startsWith('/黑盒预约 ')));
 assert.equal(rooms.length,3);
 assert.match(rooms[0].text,/灵晶60000起拍/);assert.match(rooms[1].text,/灵晶2120起拍/);assert.match(rooms[2].text,/普通额度800起拍/);
 assert.deepEqual(rooms.map(q=>q.commands),[['/黑盒预约 1 D01-1200-A'],['/黑盒预约 1 D01-1200-B'],['/黑盒预约 1 D01-1200-C']]);
 assert.doesNotMatch(message.text,/groupId|revealed_facts|instance_prototype|凝灵种植匣/);
});
test('群聊入口拦截，私聊首页仅展示资产和导航而不展开排期',async t=>{
 const group=await run(t,'/黑盒拍卖',frames.overviewSubmitted,false);
 assert.equal(group.requests.length,0);
 assert.match(group.message.text,/仅限私聊/);
 assert.deepEqual(group.message.commands,[]);
 const personal=await run(t,'/黑盒拍卖',frames.overviewSubmitted);
 const data=frames.overviewSubmitted as {allowanceAvailable:number;funds:{currency:string;available:number}[]};
 assert.ok(personal.message.text.includes(`今日普通额度 · 可用 ${data.allowanceAvailable}`));
 for(const [currency,label] of [['SPIRIT_CRYSTAL','灵晶'],['SPIRIT_MILK','道晶']]){
  const fund=data.funds.find(f=>f.currency===currency);assert.ok(fund);
  assert.ok(personal.message.text.includes(`${label} · 可用 ${fund.available}`));
 }
 assert.deepEqual(personal.message.commands.filter(c=>c.startsWith('/黑盒')),['/黑盒排期','/黑盒记录']);
 assert.doesNotMatch(personal.message.text,/12:00|公开线索/);
});
test('旧入口携带时间仅引导独立排期，不发业务请求',async t=>{
 const result=await run(t,'/黑盒拍卖 18:20',undefined);
 assert.equal(result.requests.length,0);
 assert.ok(result.message.commands.includes('/黑盒排期 18:20'));
});
test('活动未开放时明确说明额度未发放，仍显示真实钱包余额',async t=>{
 const data={...(frames.overviewSubmitted as object),enabled:false,eventId:undefined,schedule:undefined,allowanceAvailable:0,allowanceHeld:0,allowanceSpent:0};
 const {message}=await run(t,'/黑盒拍卖',data);
 assert.match(message.text,/普通额度 · 当前未开放，未发放/);
 assert.match(message.text,/活动暂未开放/);
 assert.match(message.text,/灵晶 · 可用 \d+/);assert.match(message.text,/道晶 · 可用 \d+/);
 assert.doesNotMatch(message.text,/每日赠送3000|今日普通额度：可用0/);
 assert.ok(!message.commands.some(c=>c.startsWith('/黑盒预约 ')||['/储物袋','/我的本命物'].includes(c)));
});
test('旧总览指令进入个人首页，不查询旧活动任务或商城',async t=>{
 for(const alias of ['限时活动','查看特殊活动']){
  const {requests,message}=await run(t,`/${alias}`,frames.overviewReserved);
  assert.equal(requests.length,1);assert.equal(requests[0].path,'/api/v2/robot/business/black-box.overview');
  assert.match(message.text,/黑盒拍卖会/);
  assert.deepEqual(message.commands.filter(c=>c.startsWith('/黑盒')),['/黑盒排期','/黑盒记录']);
  assert.ok(!message.commands.some(command=>/^\/活动(?:签到|任务)|^\/限时活动/.test(command)));
 }
});
test('确认窗口内显示确认，正式准入前不显示鉴宝或报价',async t=>{
 const unconfirmed=await run(t,'/黑盒记录',frames.historyUnconfirmed);
 assert.ok(unconfirmed.message.commands.includes('/黑盒确认 1 D01-1200-C'));
 assert.ok(unconfirmed.message.commands.includes('/黑盒取消 1 D01-1200-C'));
 assert.ok(!unconfirmed.message.commands.some(c=>c.startsWith('/黑盒详情 ')));
 const confirmed=await run(t,'/黑盒确认 1 D01-1200-C',frames.confirm);
 assert.equal(confirmed.requests[0].path,'/api/v2/robot/business/black-box.reservation');
 assert.deepEqual(confirmed.requests[0].body.arguments,{eventId:1,roomId:'D01-1200-C',action:'confirm'});
 assert.match(confirmed.message.text,/开拍时复查资格与资金/);assert.doesNotMatch(confirmed.message.text,/已正式入场|已扣款/);
});
test('真实两次探查回执只展示已查方向，不提供第三查',async t=>{
 const initial=parseBlackBoxRoom(frames.roomAppraisal);
 const start=await run(t,'/黑盒详情 1 D01-1200-C',frames.roomAppraisal);
 assert.equal(start.message.commands.filter(c=>c.startsWith('/黑盒鉴宝 ')).length,3);
 assert.ok(initial.appraisal!.decisionGuide);assert.ok(start.message.text.includes(initial.appraisal!.decisionGuide!));
 for (const p of initial.appraisal!.probes) {
  assert.ok(p.purpose);assert.equal(p.answer,undefined);
  const card=quotes(start.message.nodes).find(q=>q.commands.includes(`/黑盒鉴宝 1 D01-1200-C ${p.id}`));
  assert.ok(card);assert.ok(card.text.includes(p.label));assert.ok(card.text.includes(p.purpose!));
 }
 const probe=initial.appraisal!.probes[1];
 const done=await run(t,`/黑盒鉴宝 1 D01-1200-C ${probe.id}`,frames.probe2);
 assert.equal(done.requests.length,1);assert.deepEqual(done.requests[0].body.arguments,{eventId:1,roomId:'D01-1200-C',direction:probe.id});
 assert.match(done.message.text,/剩余0次/);assert.ok(!done.message.commands.some(c=>c.startsWith('/黑盒鉴宝 ')));
 assert.match(done.message.text,/免费鉴宝 · 剩余0次/);assert.doesNotMatch(done.message.text,/先查一项/);
 for(const p of parseBlackBoxRoom(frames.probe2).appraisal!.probes.filter(p=>p.answer))assert.ok(done.message.text.includes(p.answer!));
});
test('两方向拍品提供查齐按钮，并且只传all不携带客户端已查状态',async t=>{
 const initial=await run(t,'/黑盒详情 1 D02-2000-C',frames.roomTwo);
 assert.ok(initial.message.commands.includes('/黑盒鉴宝 1 D02-2000-C 全部'));
 const done=await run(t,'/黑盒鉴宝 1 D02-2000-C 全部',frames.roomTwoRevealed);
 assert.deepEqual(done.requests[0].body.arguments,{eventId:1,roomId:'D02-2000-C',all:true});assert.match(done.message.text,/剩余0次/);
});
test('灵晶出价先读预览，确认才提交金额与平台消息幂等键',async t=>{
 const preview=await run(t,'/黑盒出价 1 D01-1200-A 80000',{room:paid.roomPaidBidding,amount:80000});
 assert.equal(preview.requests.length,1);assert.equal(preview.requests[0].path,'/api/v2/robot/business/black-box.bid-preview');
 const card=quotes(preview.message.nodes).find(q=>q.commands.includes('/确认黑盒出价 1 D01-1200-A 80000'));
 assert.ok(card);assert.match(card.text,/12:00 · A入口/);assert.match(card.text,/尚未提交/);assert.match(card.text,/当前占用 60000灵晶 → 80000灵晶/);
 const done=await run(t,'/确认黑盒出价 1 D01-1200-A 80000',paid.roomPaidSubmitted);
 assert.equal(done.requests.length,1);assert.equal(done.requests[0].path,'/api/v2/robot/business/black-box.bid');assert.ok(done.requests[0].idempotencyKey);
 assert.deepEqual(done.requests[0].body.arguments,{eventId:1,roomId:'D01-1200-A',amount:80000});
 assert.match(done.message.text,/当前有效报价：80000灵晶/);assert.doesNotMatch(done.message.text,/已结算|成交支付/);
});
test('结算中不宣称到账；已结算才显示本人支付与实际奖励',async t=>{
 const pending=await run(t,'/黑盒详情 1 D01-1200-C',frames.closedPending);
 assert.match(pending.message.text,/结算中/);assert.doesNotMatch(pending.message.text,/已结算|成交支付/);
 const winner=await run(t,'/黑盒详情 1 D01-1200-C',frames.winner);
 assert.match(winner.message.text,/成交支付 1000普通额度/);assert.match(winner.message.text,/已竞得 · 已结算/);
 const loser=await run(t,'/黑盒详情 1 D01-1200-C',frames.loser);
 assert.match(loser.message.text,/900普通额度已释放/);assert.match(loser.message.text,/未竞得 · 已结算/);
 assert.match(loser.message.text,/高于本人最终有效报价/);
 assert.match(loser.message.text,/本人未查/);assert.match(winner.message.text,/本人已查/);
 assert.match(winner.message.text,/两类种子产物服务同一丹方/);
 assert.ok(loser.message.commands.includes('/储物袋'));
});
test('本人已到账实例提供对应储物袋入口，不自动穿戴学习炼化',async t=>{
 const display=structuredClone(frames.winner) as {result:{assets:unknown[]}};
 // Presentation-only category matrix; actual grants/use are tested in Go.
 display.result!.assets=[
  {category:'equipment',templateId:51,assetId:101,name:'装备展示夹具',quantity:1},
  {category:'equipment',templateId:51,assetId:102,name:'装备展示夹具',quantity:1},
  {category:'skill_book',templateId:1,assetId:201,name:'功法展示夹具',quantity:1},
  {category:'soul_artifact',templateId:1,assetId:301,name:'本命物展示夹具',quantity:1}
 ];
 const result=await run(t,'/黑盒详情 1 D01-1200-C',display);
 assert.equal(result.requests.length,1);
 const receipt=quotes(result.message.nodes).find(q=>q.text.includes('已竞得 · 已结算'));
 assert.ok(receipt);
 assert.deepEqual(receipt.commands,['/储物袋','/储物袋 装备','/储物袋 功法','/储物袋 本命']);
 assert.ok(!result.message.commands.some(c=>/^\/(穿戴|学习|炼化)/.test(c)));
 const loser=await run(t,'/黑盒详情 1 D01-1200-C',frames.loser);
 assert.ok(!quotes(loser.message.nodes).find(q=>q.text.includes('未竞得 · 已结算'))!.commands.includes('/储物袋 装备'));
});
test('群聊不提交暗标或公开本人查验，提示私聊',async t=>{
 for(const text of ['/黑盒拍卖','/黑盒拍卖 12','/黑盒排期','/黑盒排期 12','/限时活动','/查看特殊活动','/黑盒记录','/黑盒入场 1 D01-1200-C','/黑盒提醒 1 D01-1200-C','/黑盒预约 1 D01-1200-C','/黑盒确认 1 D01-1200-C','/黑盒取消 1 D01-1200-C','/黑盒撤标 1 D01-1200-C','/黑盒详情 1 D01-1200-C','/黑盒鉴宝 1 D01-1200-C 数量','/黑盒出价 1 D01-1200-A 80000','/确认黑盒出价 1 D01-1200-A 80000']){
  const result=await run(t,text,undefined,false);assert.equal(result.requests.length,0);assert.match(result.message.text,/请私聊本机器人/);assert.ok(!result.message.text.includes('80000'));
 }
});
test('格式错误不提交默认报价；服务失败回执可查记录且不自动再报价',async t=>{
 const invalid=await run(t,'/确认黑盒出价 1 D01-1200-A 1.5',undefined);assert.equal(invalid.requests.length,0);assert.match(invalid.message.text,/报价须为正整数/);
 const failed=await gameFixture(t,()=>({code:'CONFLICT',message:'报价已截止'}),409);
 await mountBlackBox(failed.app);
 const result=await failed.app.dispatch(failed.app.events.privateMessage({text:'/确认黑盒出价 1 D01-1200-A 80000',platform:'qq-bot'}));
 assert.equal(failed.requests.length,1);assert.equal(result.messages.length,1);assert.match(result.messages[0].text,/报价已截止/);assert.ok(result.messages[0].commands.includes('/黑盒记录'));assert.ok(result.messages[0].commands.includes('/黑盒排期'));
});
test('真实路由能分发新指令，同一平台消息不重复提交',async t=>{
 const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,frames.overviewReserved));
 await mountBlackBox(app);
 const event=app.events.privateMessage({text:'黑盒排期 12',platform:'qq-bot'});
 const first=await app.dispatch(event);assert.equal(first.messages.length,1);assert.equal(requests.length,1);
 const repeat=await app.dispatch({...event});assert.equal(repeat.messages.length,0);assert.equal(requests.length,1);
 for(const alias of ['限时活动','查看特殊活动']){
  const result=await app.dispatch(app.events.privateMessage({text:`${alias}`,platform:'qq-bot'}));
  assert.equal(result.messages.length,1);assert.equal(requests.at(-1)?.path,'/api/v2/robot/business/black-box.overview');
 }
});


test('读取和预览异常只提供查询恢复，不误报已提交报价', async t => {
 for (const [command, expected, refresh, privateChat] of [
  ['/黑盒排期', /排期暂未获取/, '/黑盒排期', true],
  ['/黑盒记录', /记录暂未获取/, '/黑盒记录', true],
  ['/黑盒详情 1 D01-1200-C', /记录暂未获取/, '/黑盒详情 1 D01-1200-C', true],
  ['/黑盒出价 1 D01-1200-A 80000', /预览失败 · 尚未提交报价/, '/黑盒详情 1 D01-1200-A', true]
 ] as const) {
  const { requests, message } = await run(t, command, {}, privateChat);
  assert.equal(requests.length, 1);
  assert.match(message.text, expected);
  assert.doesNotMatch(message.text, /报价结果待确认/);
  assert.deepEqual(quotes(message.nodes).flatMap(q => q.commands), [refresh]);
 }
});
test('写操作异常分别恢复预约、查验及报价，不提供再次写入按钮', async t => {
 for (const [command, expected, refresh] of [
  ['/黑盒确认 1 D01-1200-C', /预约结果待确认/, '/黑盒记录'],
  ['/黑盒鉴宝 1 D01-1200-C 全部', /查看已查线索与剩余次数/, '/黑盒详情 1 D01-1200-C'],
  ['/确认黑盒出价 1 D01-1200-A 80000', /报价结果待确认/, '/黑盒详情 1 D01-1200-A'],
  ['/黑盒撤标 1 D01-1200-A', /刷新核对报价与占用/, '/黑盒详情 1 D01-1200-A']
 ] as const) {
  const f = await gameFixture(t, () => ({code:'INTERNAL', message:'fixture failure'}), 500);
  await mountBlackBox(f.app);
 const result = await f.app.dispatch(f.app.events.privateMessage({text:command, platform:'qq-bot'}));
  assert.equal(f.requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.match(message.text, expected);
  assert.deepEqual(quotes(message.nodes).flatMap(q => q.commands), [refresh]);
  assert.doesNotMatch(message.text, /fixture failure|80000/);
 }
});
test('按阶段前置当前报价和结算，非鉴宝阶段收起选择教学', async t => {
 const bidding = await run(t, '/黑盒详情 1 D01-1200-A', paid.roomPaidSubmitted);
 const biddingQuotes = quotes(bidding.message.nodes);
 assert.match(biddingQuotes[1].text, /当前有效报价/);
 assert.ok(bidding.message.commands.includes('/黑盒详情 1 D01-1200-A'));
 assert.doesNotMatch(biddingQuotes[0].text,/升品：|播种/);
 assert.match(bidding.message.text, /剩余 \d+ 秒/);
 assert.doesNotMatch(bidding.message.text, /辨套属：判断/);
 const pending = await run(t, '/黑盒详情 1 D01-1200-C', frames.closedPending);
 assert.match(quotes(pending.message.nodes)[1].text, /结算中/);
 const winner = await run(t, '/黑盒详情 1 D01-1200-C', frames.winner);
 assert.match(quotes(winner.message.nodes)[1].text, /已竞得 · 已结算/);
 assert.doesNotMatch(winner.message.text, /服务器消息时剩余|本人免费查验剩余|已查 ·/);
});


test('服务503时总览仅提示查询失败，不泄露内部错误或暗示报价已提交', async t => {
 const f = await gameFixture(t, () => ({code:'UNAVAILABLE',message:'private backend diagnostic'}), 503);
 await mountBlackBox(f.app);
 const result = await f.app.dispatch(f.app.events.privateMessage({text:'/黑盒排期 12',platform:'qq-bot'}));
 assert.equal(f.requests.length,1);
 assert.equal(result.messages.length,1);
 const message=result.messages[0];
 assert.equal(result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
 assert.match(message.text,/排期暂未获取/);
 assert.doesNotMatch(message.text,/private backend diagnostic|报价结果待确认/);
 assert.deepEqual(quotes(message.nodes).flatMap(q=>q.commands),['/黑盒排期 12']);
});
test('首页承载额度规则，排期只展示场次和入口', async t => {
 const result=await run(t,'/黑盒排期',frames.overviewReserved);
 const home=await run(t,'/黑盒拍卖',frames.overviewReserved);
 assert.match(home.message.text,/每日最多3次底价成交/);
 assert.match(home.message.text,/失标不扣额度/);
 assert.doesNotMatch(result.message.text,/今日普通额度|可用|额度占用|每日参与补给|每日最多/);
 assert.ok(result.message.commands.includes('/黑盒拍卖'));
 assert.ok(result.message.commands.includes('/黑盒排期 22:00'));
 assert.match(result.message.text,/22:00.*高级场/);
});

test('真实Go测试福利排期支持18和19点筛选，明确区别测试期与正式开放', async t => {
 const overview=welfareOverview as {eventId:number};
 for(const hour of [18,19]){
  const result=await run(t,`/黑盒排期 ${hour}:00`,welfareOverview);
  assert.equal(result.requests.length,1);
  assert.match(result.message.text,/测试福利场/);
  assert.doesNotMatch(result.message.text,/固定灵石×50|每日参与补给|额度占用/);
  assert.match(result.message.text,/测试时间：/);
  assert.doesNotMatch(result.message.text,/这是测试福利场|正式活动按独立排期开放/);
  assert.doesNotMatch(result.message.text,/今日稀有物包含|22点各入口/);
  assert.equal(result.message.commands.filter(c=>c.startsWith(`/黑盒预约 ${overview.eventId} D01-${hour}00-`)).length,3);
 }
});

test('总览区分尚可预约和已到开拍时间，没有排期的小时给出返回入口',async t=>{
 const data=welfareOverview as {serverTime:string;schedule:{sessions:{opensAt:string}[]}};
 const before=await run(t,'/黑盒排期',data);
 assert.match(before.message.text,/18:00.*可预约/);
 const after=await run(t,'/黑盒排期',{...data,serverTime:data.schedule.sessions[0].opensAt});
 assert.match(after.message.text,/18:00.*等待开场处理/);
 const missing=await run(t,'/黑盒排期 17',data);
 assert.match(missing.message.text,/今日17点暂无场次/);
 assert.ok(quotes(missing.message.nodes).some(q=>q.commands.includes('/黑盒排期')));
});


test('暗标自定报价只填入输入框，拍品操作同块且保留默认导航', async t => {
 const result = await run(t, '/黑盒详情 1 D01-1200-A', paid.roomPaidSubmitted);
 const cards = quotes(result.message.nodes);
 const bidCard = cards.find(card => card.commands.includes('/黑盒出价 1 D01-1200-A '));
 assert.ok(bidCard);
 assert.match(bidCard.text, /当前有效报价：80000灵晶/);
 assert.match(bidCard.text, /撤标仍占用底价至结算/);
 assert.ok(bidCard.commands.includes('/黑盒出价 1 D01-1200-A 60000'));
 assert.ok(bidCard.commands.includes('/黑盒撤标 1 D01-1200-A'));
 const nodes = result.message.nodes.flatMap(n => n.type === 'Markdown' ? n.value : []);
 const children = nodes.flatMap(n => n.type === 'MD.blockquote' && Array.isArray(n.value) ? n.value : []);
 const input = children.find(n => n.type === 'MD.button' && n.options?.data === '/黑盒出价 1 D01-1200-A ');
 assert.ok(input && input.type === 'MD.button');
 assert.equal(input.options?.autoEnter,false);
 for (const command of ['/我', '/属性面板', '/查看主线', '/我的活动', '/商店']) assert.ok(result.message.commands.includes(command));
 assert.doesNotMatch(result.message.text, /服务器消息时|以服务器时间为准|消息传输|出价：\/黑盒出价|允许推断或交流/);
});

test('我的预约使用统一分页，确认截止和操作仍在记录块内', async t => {
 const data = { ...(frames.historyUnconfirmed as object), page: 2, hasMore: true };
 const result = await run(t, '/黑盒记录 2', data);
 const cards = quotes(result.message.nodes);
 assert.ok(cards.some(card => card.commands.includes('/黑盒确认 1 D01-1200-C') && /确认窗口/.test(card.text)));
 assert.match(result.message.text, /第2页/);
 assert.ok(result.message.commands.includes('/黑盒记录 1'));
 assert.ok(result.message.commands.includes('/黑盒记录 3'));
 assert.ok(!cards.some(card => /^第2页/.test(card.text)));
});

test('已查线索保留答案，查尽后不再附带选择教学和用途列表', async t => {
 const data = parseBlackBoxRoom(frames.probe2);
 const result = await run(t, '/黑盒详情 1 D01-1200-C', frames.probe2);
 for (const probe of data.appraisal!.probes.filter(p => p.answer !== undefined)) {
  assert.ok(quotes(result.message.nodes).some(card => card.text.includes(probe.label) && card.text.includes(probe.answer!)));
 }
 assert.ok(!result.message.commands.some(c => c.startsWith('/黑盒鉴宝 ')));
 assert.doesNotMatch(result.message.text, /先查一项|还可选择|未查方向只表示|本场次数已用完|实例#/);
});

test('20分钟排期用完整时间进入独立场次，小时筛选保留三场',async t=>{
 const overview=welfareOverview as {eventId:number};
 const all=await run(t,'/黑盒排期',welfareOverview);
 assert.ok(all.message.commands.includes('/黑盒排期 18:20'));
 assert.ok(all.message.commands.includes('/黑盒排期 23:00'));
 for(const at of ['18:20','18：40','23:00']){
  const {message}=await run(t,`/黑盒排期 ${at}`,welfareOverview);
  const reservations=message.commands.filter(c=>c.startsWith('/黑盒预约 '));
  assert.equal(reservations.length,3);
  assert.ok(reservations.every(c=>c.startsWith(`/黑盒预约 ${overview.eventId} D01-${at.replace(/[:：]/g,'')}-`)));
 }
 const hour=await run(t,'/黑盒排期 18',welfareOverview);
 assert.equal(hour.message.commands.filter(c=>c.startsWith('/黑盒预约 ')).length,9);
 const missing=await run(t,'/黑盒排期 18:10',welfareOverview);
 assert.match(missing.message.text,/今日18:10暂无场次/);
});

test('已排期和已结束活动分别提示，不伪装成未开放',async t=>{
 const base={...(frames.overviewReserved as object),enabled:false,schedule:undefined,allowanceAvailable:0};
 const future=await run(t,'/黑盒拍卖',{...base,state:'scheduled',startsAt:'2026-10-24T00:00:00+08:00'});
 assert.match(future.message.text,/活动已排期，开放时间：10-24 00:00:00/);
 const ended=await run(t,'/黑盒拍卖',{...base,state:'ended'});
 assert.match(ended.message.text,/本批排期已结束/);
});
test('已取消入口不再显示预约按钮，未入场记录展示服务器原因',async t=>{
 const source=structuredClone(welfareOverview) as {schedule:{sessions:{rooms:{status?:string}[]}[]}};
 source.schedule.sessions[0].rooms.forEach(r=>{r.status='cancelled'});
 const overview=await run(t,'/黑盒排期 18:00',source);
 assert.match(overview.message.text,/本入口已取消/);
 assert.ok(!overview.message.commands.some(c=>c.startsWith('/黑盒预约 ')));
 const history=structuredClone(frames.historyUnconfirmed) as {items:{status:string;statusReason?:string;confirmed:boolean}[]};
 history.items[0].status='cancelled';history.items[0].confirmed=true;
 history.items[0].statusReason='合格参拍人数不足，系统取消本场；本次未入场，未扣款';
 const result=await run(t,'/黑盒记录',history);
 assert.match(result.message.text,/合格参拍人数不足，系统取消本场；本次未入场，未扣款/);
});


test('点击入场协议：提前仅提醒，窗口中可入场，等待不显示确认或鉴宝',async t=>{
 const early=await run(t,'/黑盒排期 12',clickFrames.overviewBefore);
 assert.match(early.message.text,/通知我/);
 assert.match(early.message.text,/开场前3分钟/);
 assert.ok(early.message.commands.some(c=>c.startsWith('/黑盒提醒 ')));
 assert.ok(!early.message.commands.some(c=>c.startsWith('/黑盒确认 ')));
 const open=await run(t,'/黑盒排期 12',clickFrames.overviewOpen);
 assert.ok(open.message.commands.includes('/黑盒入场 1 D01-1200-C'));
 assert.doesNotMatch(open.message.text,/今日普通额度 · 可用/);
 const waiting=await run(t,'/黑盒入场 1 D01-1200-C',clickFrames.waiting);
 assert.deepEqual(waiting.requests[0].body.arguments,{eventId:1,roomId:'D01-1200-C',action:'join'});
 assert.match(waiting.message.text,/排队中 · 不占用资金/);
 assert.ok(!waiting.message.commands.some(c=>c.startsWith('/黑盒鉴宝 ')));
 const history=await run(t,'/黑盒记录',clickFrames.historyWaiting);
 assert.match(history.message.text,/等人/);
 assert.ok(!history.message.commands.some(c=>c.startsWith('/黑盒确认 ')));
});

test('截止后组成两人组按实际开组时刻鉴宝，不沿用场次时刻',async t=>{
 const room=parseBlackBoxRoom(clickFrames.roomStarted);
 assert.ok(room.groupStartsAt);
 assert.equal(new Date(room.groupStartsAt!).getTime()-new Date(room.opensAt).getTime(),5*60*1000);
 const result=await run(t,'/黑盒详情 1 D01-1200-C',clickFrames.roomStarted);
 assert.match(result.message.text,/12:06/);
 assert.ok(result.message.commands.some(c=>c.startsWith('/黑盒鉴宝 ')));
 assert.ok(!result.message.commands.some(c=>c.startsWith('/黑盒确认 ')));
});


test('未知入场协议拒绝展示旧确认流程',()=>{
 const overview=structuredClone(clickFrames.overviewOpen) as {schedule:{admissionPolicy:string}};
 overview.schedule.admissionPolicy='future-unknown';
 assert.throws(()=>parseBlackBoxOverview(overview));
});


test('正式场暗标截止后显示统一揭晓时刻，不暴露拍品或重开报价',async t=>{
 const view=parseBlackBoxRoom(clickFrames.roomAwaitingReveal);
 assert.equal(view.content,undefined);assert.equal(view.result,undefined);
 assert.ok(view.revealsAt);
 const result=await run(t,'/黑盒详情 1 D01-1200-C',clickFrames.roomAwaitingReveal);
 assert.match(result.message.text,/12:09统一揭晓并结算/);
 assert.ok(!result.message.commands.some(c=>c.startsWith('/黑盒报价 ')));
 assert.doesNotMatch(result.message.text,/拍品揭晓：/);
});


test('系统取消显示服务端实际退款，不显示拍品或新报价',async t=>{
 const view=parseBlackBoxRoom(cancelledRoom);
 assert.equal(view.result?.outcome,'system_cancelled');
 assert.equal(view.ownHeld,0);
 assert.equal(view.result?.charged,0);
 const result=await run(t,'/黑盒详情 1 D01-1200-C',cancelledRoom);
 assert.match(result.message.text,/系统取消/);
 assert.match(result.message.text,new RegExp(`${view.result!.released}.*已释放`));
 assert.doesNotMatch(result.message.text,/拍品揭晓：/);
 assert.ok(!result.message.commands.some(c=>c.startsWith('/黑盒报价 ')));
 const receipt=quotes(result.message.nodes).find(q=>q.text.includes('系统取消 · 已结算'));
 assert.ok(receipt);assert.deepEqual(receipt.commands,['/黑盒记录']);
});

test('选场公共规则只显示一次，入口线索与操作仍在同块', async t => {
 const {message}=await run(t,'/黑盒排期 12',clickFrames.overviewOpen);
 assert.equal(message.text.split('3人即开，截止2人开，1人流拍').length-1,1);
 const cards=quotes(message.nodes).filter(q=>q.commands.some(c=>c.startsWith('/黑盒入场 ')));
 assert.equal(cards.length,3);
 for(const card of cards){assert.match(card.text,/起拍/);assert.doesNotMatch(card.text,/入场截止/);}
});

test('点击制已过截止的提醒记录不显示旧制确认窗口', async t => {
 const data=structuredClone(clickFrames.historyWaiting) as {serverTime:string;items:{status:string;joinClosesAt:string}[]};
 for(const item of data.items)item.status='reserved';
 data.serverTime=new Date(Math.max(...data.items.map(item=>Date.parse(item.joinClosesAt)))+1000).toISOString();
 const {message}=await run(t,'/黑盒记录',data);
 assert.doesNotMatch(message.text,/确认窗口|待入场/);
 assert.match(message.text,/入场已截止/);
 assert.ok(!message.commands.some(command=>command.startsWith('/黑盒确认 ')||command.startsWith('/黑盒入场 ')));
});

test('零报价且无占用的提醒记录省略资金行，仍保留状态和操作', async t => {
 const data=structuredClone(clickFrames.historyWaiting) as {items:{status:string;ownBid:number;ownHeld:number}[]};
 for(const item of data.items){item.status='reserved';item.ownBid=0;item.ownHeld=0;}
 const {message}=await run(t,'/黑盒记录',data);
 assert.match(message.text,/入场/);
 assert.doesNotMatch(message.text,/报价 0|占用 0/);
 assert.ok(message.commands.some(command=>command.startsWith('/黑盒取消 ')));
});

test('预约类路由直接绑定动作，提醒与预约共享subscribe且不会误入其他指令', async t => {
  for (const [command, action] of [
    ['黑盒入场', 'join'],
    ['黑盒提醒', 'subscribe'],
    ['黑盒预约', 'subscribe'],
    ['黑盒确认', 'confirm'],
    ['黑盒取消', 'cancel']
  ]) {
    const { requests, result } = await run(t, `/${command} 1 D01-1200-C`, frames.confirm);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/business/black-box.reservation');
    assert.deepEqual(requests[0].body.arguments, { eventId: 1, roomId: 'D01-1200-C', action });
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  }
});

test('正式场报价前展示统一结算时间和占用期限', async t => {
 const room = clickFrames.roomBidding;
 assert.equal(parseBlackBoxRoom(room).phase, 'bidding');
 const detail = await run(t, '/黑盒详情 1 D01-1200-C', room);
 assert.match(detail.message.text, /全场12:09起统一揭晓并结算，暗标截止后资金仍占用至结算/);
 const preview = await run(t, '/黑盒出价 1 D01-1200-C 800', {room, amount: 800});
 assert.match(preview.message.text, /全场12:09起统一揭晓并结算，暗标截止后资金仍占用至结算/);
 assert.match(preview.message.text, /尚未提交/);
});

 test('入场回执按实际组时钟区分鉴宝、暗标和等待结算', async t => {
 const room = parseBlackBoxRoom(clickFrames.roomStarted);
 const starts = Date.parse(room.groupStartsAt!);
 for (const [offset, label] of [[0, '鉴宝中'], [59999, '鉴宝中'], [60000, '暗标中'], [179999, '暗标中'], [180000, '暗标已截止 · 等待结算']] as const) {
 const receipt = {...(clickFrames.waiting as Record<string, unknown>), status: 'admitted', groupStartsAt: room.groupStartsAt, serverTime: new Date(starts + offset).toISOString()};
 const result = await run(t, '/黑盒入场 1 D01-1200-C', receipt);
 assert.ok(result.message.text.includes(label));
 assert.doesNotMatch(result.message.text, /已开拍 · 私聊鉴宝与暗标/);
 assert.ok(result.message.commands.includes('/黑盒详情 1 D01-1200-C'));
 }
 });
 test('详情标记查询时间，待结算不会误报已结束', async t => {
 const active = await run(t, '/黑盒详情 1 D01-1200-C', clickFrames.roomStarted);
 assert.match(active.message.text, /查询时剩余 60 秒/);
 assert.match(active.message.text, /状态截至 .*刷新查看最新状态/);
 const closed = await run(t, '/黑盒详情 1 D01-1200-C', clickFrames.roomAwaitingReveal);
 assert.match(closed.message.text, /等待结算/);
 assert.doesNotMatch(closed.message.text, /已结束|查询时剩余/);
 });

test('提醒回执和记录在开场及截止边界保持一致', async t => {
 const waiting = clickFrames.waiting as Record<string, unknown>;
 const open = Date.parse(waiting.opensAt as string);
 const close = Date.parse(waiting.joinClosesAt as string);
 for (const [now, label, canJoin] of [[open - 1, '待开场', false], [open, '可入场', true], [close, '入场已截止', false]] as const) {
 const serverTime = new Date(now).toISOString();
 const receipt = {...waiting, status: 'reserved', serverTime};
 const reply = await run(t, '/黑盒提醒 1 D01-1200-C', receipt);
 const history = structuredClone(clickFrames.historyWaiting) as {serverTime:string;items:Record<string,unknown>[]};
 history.serverTime = serverTime;
 history.items[0].status = 'reserved';
 const record = await run(t, '/黑盒记录', history);
 for (const result of [reply, record]) {
 assert.ok(result.message.text.includes(label));
 assert.equal(result.message.commands.includes('/黑盒入场 1 D01-1200-C'), canJoin);
 }
 }
});
test('记录页同步实际组时钟，报价区明确撤标占用至结算', async t => {
 const history = structuredClone(clickFrames.historyStarted) as {serverTime:string;items:Record<string,unknown>[]};
 const starts = Date.parse(history.items[0].groupStartsAt as string);
 for (const [offset, label] of [[0, '鉴宝中'], [60000, '暗标中'], [180000, '等待结算']] as const) {
 history.serverTime = new Date(starts + offset).toISOString();
 const result = await run(t, '/黑盒记录', history);
 assert.ok(result.message.text.includes(label));
 assert.ok(result.message.commands.includes('/黑盒详情 1 D01-1200-C'));
 }
 const room = await run(t, '/黑盒详情 1 D01-1200-C', clickFrames.roomBidding);
 assert.match(room.message.text, /撤标仍占用底价至结算/);
 assert.doesNotMatch(room.message.text, /撤标仍占用底价至结束/);
});

test('从报价错误气泡连续点击返回、预览、确认和撤标', async t => {
 let response: unknown = paid.roomPaidBidding;
 const f = await gameFixture(t, r => businessEnvelope(r.bid, response));
 await mountBlackBox(f.app);
 const dispatch = async (command: string) => {
 const result = await f.app.dispatch(f.app.events.privateMessage({text: command, platform: 'qq-bot'}));
 assert.equal(result.messages.length, 1);
 const message = result.messages[0];
 assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
 return message;
 };
 const select = (message: Awaited<ReturnType<typeof dispatch>>, prefix: string) => {
 const command = message.commands.find(c => c.startsWith(prefix));
 assert.ok(command, prefix);
 return command;
 };
 let message = await dispatch('/黑盒出价 1 D01-1200-A');
 assert.equal(f.requests.length, 0);
 assert.ok(select(message, '/黑盒出价 ').endsWith(' '));
 message = await dispatch(select(message, '/黑盒详情 '));
 response = {room: paid.roomPaidBidding, amount: 80000};
 const custom = message.commands.find(c => c === '/黑盒出价 1 D01-1200-A ');
 assert.ok(custom);
 message = await dispatch(custom + '80000');
 assert.match(message.text, /尚未提交/);
 response = paid.roomPaidSubmitted;
 message = await dispatch(select(message, '/确认黑盒出价 '));
 assert.match(message.text, /当前有效报价/);
 const withdraw = select(message, '/黑盒撤标 ');
 response = {...(paid.roomPaidBidding as Record<string, unknown>), ownBid: 0};
 message = await dispatch(withdraw);
 assert.match(message.text, /尚未提交/);
 assert.equal(f.requests.at(-1)?.body.arguments && (f.requests.at(-1)!.body.arguments as {amount:number}).amount, 0);
 assert.ok(select(message, '/黑盒详情 '));
});

test('非法报价保留本场恢复入口，取消后仅有效当天返回同场', async t => {
 for (const command of ['/黑盒出价 1 D01-1200-C abc', '/确认黑盒出价 1 D01-1200-C 0']) {
 const result = await run(t, command, undefined);
 assert.equal(result.requests.length, 0);
 assert.ok(result.message.commands.includes('/黑盒详情 1 D01-1200-C'));
 assert.ok(result.message.commands.includes('/黑盒出价 1 D01-1200-C '));
 }
 const base = clickFrames.waiting as Record<string, unknown>;
 for (const [time, expected] of [[base.serverTime, true], [base.joinClosesAt, false], [new Date(Date.parse(base.opensAt as string)-86400000).toISOString(), false]] as const) {
 const result = await run(t, '/黑盒取消 1 D01-1200-C', {...base, status:'cancelled', serverTime:time});
 assert.equal(result.message.commands.includes('/黑盒排期 12:00'), expected);
 }
});

test('本场通知可独立关闭，气泡明确不退队不改变资金', async t => {
 const result = await run(t, '/黑盒提醒 1 D01-1200-C 关闭', clickFrames.subscriptionDisabled);
 assert.deepEqual(result.requests[0].body.arguments,{eventId:1,roomId:'D01-1200-C',action:'unsubscribe'});
 assert.match(result.message.text,/本场通知已关闭/);
 assert.match(result.message.text,/不改变报价及资金占用/);
 assert.match(result.message.text,/鉴宝中/);
 assert.ok(result.message.commands.includes('/黑盒提醒 1 D01-1200-C'));
 const room = await run(t,'/黑盒详情 1 D01-1200-C',clickFrames.roomBidding);
 assert.ok(room.message.commands.includes('/黑盒提醒 1 D01-1200-C 关闭'));
 const history = await run(t,'/黑盒记录',clickFrames.historyStarted);
 assert.ok(history.message.commands.includes('/黑盒提醒 1 D01-1200-C 关闭'));
});
