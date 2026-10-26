import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { battleMemoryUrl } from '../../src/utils/battleMemoryMessage';
import robbery from '../../src/response/robbery/res';
import counter from '../../src/response/counterAttack/res';
import targets from '../../src/response/pkTargets/res';
import hiding from '../../src/response/pkHiding/res';
import { businessEnvelope, gameFixture } from './fixture';

before(()=>mock.timers.enable({apis:['setTimeout']}));
after(async()=>{mock.timers.reset();await shutdownLogger();});
const unit={Name:'道友',HP:20,MaxHP:100,Dead:false};
const pk={pkRulesVersion:1,pkEventId:71,actorSide:'B',won:true,pkState:'waiting',pkDeliveryState:'pending',counterDeadline:'2026-10-20T18:00:00+08:00'};
const receipt={...pk,winner:'B',attackerName:'我',targetName:'道友',battleLogId:'battle-71',logId:71,qiCost:15,remaining:7,dailyMax:10,stoneReward:60,crystalReward:2,shaQiChange:1,currentShaQi:5,experience:12,bonusText:'连胜奖励 +2',losingStreakText:'',droppedItem:{name:'青锋剑',quantity:1,category:'equipment'},battleView:{totalRounds:3,finalState:{sideA:[unit],sideB:[unit]}}};
function cards(nodes:NonNullable<Parameters<typeof inspectMessage>[0]>){return nodes.flatMap(n=>n.type==='Markdown'?n.value.filter(child=>child.type==='MD.blockquote'):[]).map(q=>{if(q.type!=='MD.blockquote'||!Array.isArray(q.value))throw Error('Expected quote');return inspectMessage([{type:'Markdown',value:q.value}]);});}
for(const isPrivate of [false,true]){
 test(`打劫结果分清胜负、到账奖励和暂存物品（${isPrivate?'私聊':'群聊'}）`,async t=>{
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,receipt));
  const event=isPrivate?app.events.privateMessage({text:'/打劫 2',platform:'qq-bot'}):app.events.groupMessage({text:'/打劫 2',platform:'qq-bot'});
  const result=await app.runHandler(robbery,event);
  assert.equal(requests.length,1);assert.deepEqual(requests[0].body.arguments,{target:{uid:2}});
  assert.equal(result.messages.length,isPrivate?1:2);
  for(const message of result.messages)assert.equal(result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
  const rows=cards(result.messages[0].nodes);assert.equal(rows.length,3);
  assert.match(rows[0].text,/道友 · 打劫成功/);assert.match(rows[0].text,/元力 -15 · 今日剩余7\/10次/);assert.match(rows[0].text,/3回合/);
  assert.match(rows[1].text,/灵石\+60.*灵晶\+2/s);assert.match(rows[1].text,/煞气 \+1（当前5）/);assert.match(rows[1].text,/修为 \+12/);assert.match(rows[1].text,/连胜奖励 \+2/);
  assert.doesNotMatch(rows[1].text,/青锋剑/);assert.match(rows[2].text,/暂存：青锋剑×1（尚未到手）/);assert.match(rows[2].text,/2026-10-20 18:00:00/);
  const view=inspectMessage(result.messages[0].nodes);assert.ok(view.commands.includes('/争夺回放 71 原战 1'));assert.ok(view.commands.includes('/争夺战报 71'));
  assert.doesNotMatch(view.text,/战斗类型：|胜负：|原物暂存|即时取得/);
  if(!isPrivate){const broadcast=inspectMessage(result.messages[1].nodes);assert.match(broadcast.text,/物品暂存待结算/);assert.doesNotMatch(broadcast.text,/青锋剑/);assert.equal(broadcast.commands.length,0);}
 });
}
test('失败保留修为和连败状态，不展示获胜奖励或群播报',async t=>{
 const data={...receipt,winner:'A',won:false,stoneReward:0,crystalReward:0,droppedItem:null,pkDeliveryState:'none',bonusText:'',losingStreakText:'连败保护已生效'};
 const {app}=await gameFixture(t,r=>businessEnvelope(r.bid,data));
 const result=await app.runHandler(robbery,app.events.groupMessage({text:'/打劫 2',platform:'qq-bot'}));
 assert.equal(result.messages.length,1);const message=result.messages[0];assert.equal(result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
 const view=inspectMessage(message.nodes);assert.match(view.text,/打劫失败/);assert.match(view.text,/修为 \+12/);assert.match(view.text,/连败保护已生效/);assert.doesNotMatch(view.text,/灵石\+|灵晶\+|青锋剑|煞气 \+/);
});
for(const [state,delivery,expected]of [['counter_won','restored','物品已归还原主'],['counter_lost','pending','物品已确定归打劫者，待交付'],['counter_lost','delivered','物品已交付打劫者']]as const){
 test(`免费反击按真实回执显示物品归属：${delivery}`,async t=>{
  const data={...receipt,won:state==='counter_won',pkState:state,pkDeliveryState:delivery,qiCost:0,stoneReward:0,crystalReward:0,experience:0,shaQiChange:0,shaQiBonus:0,droppedItem:null,battle:{Rounds:4,SideA:[unit],SideB:[unit]}};
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,data));
  const result=await app.runHandler(counter,app.events.privateMessage({text:'/回击 71',platform:'qq-bot'}));
  assert.equal(requests.length,1);assert.deepEqual(requests[0].body.arguments,{logId:'71'});assert.equal(result.messages.length,1);
  const m=result.messages[0];assert.equal(result.actions[m.actionIndex].results?.[0].code,ResultCode.Ok);
  const view=inspectMessage(m.nodes);assert.match(view.text,/免费反击 · 本次机会已使用/);assert.ok(view.text.includes(expected));
  assert.ok(view.commands.includes('/争夺回放 71 反击 1'));assert.doesNotMatch(view.text,/灵石\+|掉落：|对方身无分文|消耗元力：/);
 });
}
for (const isPrivate of [false, true]) {
 for (const won of [false, true]) {
  test(`免费反击获得修为后仍发送本场战斗回忆（${isPrivate ? '私聊' : '群聊'}·${won ? '获胜' : '未获胜'}）`, async t => {
   const data = {
    ...receipt, battleLogId: 'counter-71', logId: 92, won,
    pkState: won ? 'counter_won' : 'counter_lost', pkDeliveryState: 'none',
    qiCost: 0, stoneReward: 0, crystalReward: 0, experience: 42, shaQiChange: 0, shaQiBonus: 0,
    droppedItem: null, battle: { Rounds: 4, SideA: [unit], SideB: [unit] }
   };
   const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, data));
   const event = isPrivate
    ? app.events.privateMessage({ text: '/回击 71', platform: 'qq-bot' })
    : app.events.groupMessage({ text: '/回击 71', platform: 'qq-bot' });
   const result = await app.runHandler(counter, event);
   assert.deepEqual(result.errors, []);
   assert.equal(requests.length, 1);
   assert.deepEqual(requests[0].body.arguments, { logId: '71' });
   assert.equal(result.messages.length, 1);
   const message = result.messages[0];
   assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
   const view = inspectMessage(message.nodes);
   assert.match(view.text, /免费反击 · 本次机会已使用/);
   assert.match(view.text, /修为 \+42/);
   assert.ok(view.text.includes(won ? '反击成功' : '反击失败'));
   assert.doesNotMatch(view.text, /免费反击回执包含不应有的消耗或奖励/);
   assert.ok(view.commands.includes('/争夺回放 71 反击 1'));
   assert.ok(view.commands.includes('/争夺战报 71'));
   const buttons = message.nodes.flatMap(node => node.type === 'BT.group' ? node.value.flatMap(row => row.value) : []);
   const memory = buttons.filter(button => button.value === '查看战斗回忆');
   assert.equal(memory.length, 1);
   assert.equal(memory[0].options?.type, 'link');
   assert.equal(memory[0].options?.data, battleMemoryUrl('counter-71'));
   assert.ok(!buttons.some(button => button.options?.data === battleMemoryUrl('battle-71')));
  });
 }
}
test('目标卡片保留服务端概率、收益倍率及同目标次数',async t=>{
 const data={mode:'active',canAttack:true,reason:'',qiCost:15,dailyRemaining:8,dailyLimit:10,items:[{uid:2,name:'道友',realmName:'筑基',sameTargetRemaining:3,pairOrdinal:2,rewardPercent:60,itemChancePercent:24}]};
 const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,data));
 const result=await app.runHandler(targets,app.events.privateMessage({text:'/可打劫道友',platform:'qq-bot'}));
 assert.equal(requests.length,1);assert.equal(result.messages.length,1);const m=result.messages[0];assert.equal(result.actions[m.actionIndex].results?.[0].code,ResultCode.Ok);
 const row=cards(m.nodes)[0];assert.match(row.text,/剩余3次/);assert.match(row.text,/灵石收益 ×0.6/);assert.match(row.text,/24%（可能落空）/);assert.ok(row.commands.includes('/打劫 2'));
});
test('隐藏物品保留库存、保护和可执行动作，移除手写指令教程',async t=>{
 const item={assetKind:'item',assetId:8,name:'草药',quantity:12,hiddenQuantity:2,heldQuantity:3,maxHiddenQuantity:9,protectionText:'暂存物品不可隐藏'};
 const {app}=await gameFixture(t,r=>businessEnvelope(r.bid,{assetKind:'item',view:{capacity:4,used:1,assets:[]},inventory:{items:[item]}}));
 const result=await app.runHandler(hiding,app.events.privateMessage({text:'/隐藏物品',platform:'qq-bot'}));
 assert.equal(result.messages.length,1);const m=result.messages[0];assert.equal(result.actions[m.actionIndex].results?.[0].code,ResultCode.Ok);
 const row=cards(m.nodes)[0];assert.match(row.text,/【8】草药/);assert.match(row.text,/库存12 · 已隐藏2 · 争夺暂存3/);assert.match(row.text,/暂存物品不可隐藏/);
 assert.ok(row.commands.includes('/设置隐藏 物品 8 1'));assert.ok(!row.commands.includes('/设置隐藏 物品 8 10'));
 assert.doesNotMatch(inspectMessage(m.nodes).text,/自定义数量：|绝对数量/);
});

test('战斗回执无法展示时引导查记录，不把已结算的操作误报成失败',async t=>{
 const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,{...receipt,battleView:null}));
 const result=await app.runHandler(robbery,app.events.privateMessage({text:'/打劫 2',platform:'qq-bot'}));
 assert.equal(requests.length,1);assert.equal(result.messages.length,1);
 const message=result.messages[0];assert.equal(result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
 const view=inspectMessage(message.nodes);assert.match(view.text,/打劫结果暂未确认/);assert.ok(view.commands.includes('/打劫记录'));
 assert.doesNotMatch(view.text,/打劫失败|请稍后再试/);
});

for (const [label, patch] of [
 ['缺少战斗快照', { battle: null }],
 ['负数修为', { experience: -1 }],
 ['小数修为', { experience: 1.5 }],
 ['非法元力消耗', { qiCost: 15 }],
 ['非法货币奖励', { stoneReward: 10 }],
 ['非法煞气变动', { shaQiChange: 1 }]
] as const) {
 test(`反击异常回执提供只读恢复入口，不泄露技术错误或重新结算：${label}`, async t => {
  const data = {
   ...receipt, pkState: 'counter_won', pkDeliveryState: 'none', qiCost: 0,
   stoneReward: 0, crystalReward: 0, experience: 42, shaQiChange: 0, shaQiBonus: 0,
   droppedItem: null, battle: { Rounds: 4, SideA: [unit], SideB: [unit] }, ...patch
  };
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, data));
  const result = await app.runHandler(counter, app.events.privateMessage({ text: '/回击 3393', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body.arguments, { logId: '3393' });
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /反击结果暂时无法展示/);
  assert.doesNotMatch(view.text, /反击失败|免费反击回执包含|反击响应不完整|修为 \+|灵石\+/);
  assert.ok(view.commands.includes('/争夺战报 3393'));
  assert.ok(view.commands.includes('/争夺回放 3393 反击 1'));
  assert.ok(view.commands.includes('/打劫记录'));
  assert.ok(!view.commands.some(command => command.startsWith('/回击')));
  assert.ok(!JSON.stringify(message.nodes).includes('components/battle-memory'));
 });
}

test('反击异常时不为不安全的战报编号生成恢复按钮', async t => {
 const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { ...receipt, battle: null }));
 const result = await app.runHandler(counter, app.events.groupMessage({ text: '/回击 9007199254740992', platform: 'qq-bot' }));
 assert.deepEqual(result.errors, []);
 assert.equal(requests.length, 1);
 assert.equal(result.messages.length, 1);
 const message = result.messages[0];
 assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
 const view = inspectMessage(message.nodes);
 assert.ok(view.commands.includes('/打劫记录'));
 assert.ok(!view.commands.some(command => /^\/(争夺战报|争夺回放|回击)/.test(command)));
});

test('服务端明确拒绝反击时保留原原因，不改报结果未知', async t => {
 const { app, requests } = await gameFixture(t, () => ({ code: 'CONFLICT', message: '该被打记录已超过24小时反击期限' }), 409);
 const result = await app.runHandler(counter, app.events.privateMessage({ text: '/回击 3393', platform: 'qq-bot' }));
 assert.deepEqual(result.errors, []);
 assert.equal(requests.length, 1);
 assert.equal(result.messages.length, 1);
 const message = result.messages[0];
 assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
 const view = inspectMessage(message.nodes);
 assert.match(view.text, /该被打记录已超过24小时反击期限/);
 assert.doesNotMatch(view.text, /反击结果暂时无法展示|反击成功/);
});

test('反击服务异常不透出内部错误，保留原战报核对入口', async t => {
 const { app, requests } = await gameFixture(t, () => ({ code: 'INTERNAL', message: 'internal SQL counter debug details' }), 500);
 const result = await app.runHandler(counter, app.events.privateMessage({ text: '/回击 3393', platform: 'qq-bot' }));
 assert.deepEqual(result.errors, []);
 assert.equal(requests.length, 1);
 assert.equal(result.messages.length, 1);
 const message = result.messages[0];
 assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
 const view = inspectMessage(message.nodes);
 assert.match(view.text, /服务暂时不可用/);
 assert.doesNotMatch(view.text, /SQL|internal|debug|反击失败|反击成功/);
 assert.ok(view.commands.includes('/争夺战报 3393'));
 assert.ok(view.commands.includes('/争夺回放 3393 反击 1'));
 assert.ok(!view.commands.some(command => command.startsWith('/回击')));
});
