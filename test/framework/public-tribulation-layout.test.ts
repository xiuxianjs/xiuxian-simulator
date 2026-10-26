import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { Format, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/tribulation/publicRes';
import participationHandler from '../../src/response/tribulation/res';
import { FormatGui } from '../../src/utils/messageHelper';
import { useMessage } from '../../src/utils/useMessage';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const event = { eventId:7,playerId:101,name:'阿月',currentRealm:'化神圆满',targetRealm:'洞虚',targetStage:5,tribulationName:'四九雷劫',requiredAttempts:3,status:'charging',opensAt:'2026-10-01T01:00:00Z',deadline:'2026-10-01T07:00:00Z',strikeAt:'2026-10-01T01:30:00Z',interactionOpen:true,participationOpen:true,canStart:false };
function cards(nodes: NonNullable<Parameters<typeof inspectMessage>[0]>) {
  return nodes.flatMap(node=>node.type==='Markdown'?node.value.filter(child=>child.type==='MD.blockquote'):[]).map(quote=>{
    if(quote.type!=='MD.blockquote'||!Array.isArray(quote.value))throw Error('Expected structured quote');
    return inspectMessage([{type:'Markdown',value:quote.value}]);
  });
}
for(const privateChat of [false,true]){
 test(`劫云榜采用商店的导航、条目与独立分页结构（${privateChat?'私聊':'群聊'}）`,async t=>{
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,Array.from({length:6},(_,i)=>({...event,eventId:i+7,name:`道友${i}`}))));
  const e=privateChat?app.events.privateMessage({text:'/劫云榜',platform:'qq-bot'}):app.events.groupMessage({text:'/劫云榜',platform:'qq-bot'});
  const result=await app.runHandler(handler,e);
  assert.equal(requests.length,1);assert.equal(result.messages.length,1);
  const message=result.messages[0];assert.equal(result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
  const rows=cards(message.nodes);assert.equal(rows.length,5);
  for(const [i,row]of rows.entries()){
   assert.match(row.text,new RegExp(`【四九雷劫】道友${i}`));assert.match(row.text,/化神圆满 → 洞虚 · 待落雷/);
   assert.match(row.text,/落雷：2026-10-01 09:30:00/);
   assert.deepEqual(row.commands,[`/参与观望 ${i+7}`, `/捣乱渡劫 ${i+7}`]);
   assert.match(row.text,/捣乱会增强对方雷劫，并可能计入自身渡劫因果/);
   assert.doesNotMatch(row.text,/UID|第\d+页|刷新/);
  }
  const view=inspectMessage(message.nodes);assert.match(view.text,/第1页/);assert.doesNotMatch(view.text,/第1\/|共\d+条/);
  assert.ok(view.commands.includes('/劫云榜 2'));assert.ok(!view.commands.includes('/劫云榜 0'));
  const markdown=message.nodes.find(n=>n.type==='Markdown');assert.ok(markdown);
  const firstQuote=markdown.value.findIndex(n=>n.type==='MD.blockquote');
  const ownEntry=markdown.value.findIndex(n=>n.type==='MD.button'&&n.options?.data==='/我的渡劫');
  const nextPage=markdown.value.findIndex(n=>n.type==='MD.button'&&n.options?.data==='/劫云榜 2');
  assert.ok(ownEntry>=0&&ownEntry<firstQuote);assert.ok(nextPage>firstQuote);
 });
}
test('使用实际下一页按钮保留道号筛选，末页不伪造页数或下一页',async t=>{
 const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,Number(r.body.arguments&&((r.body.arguments as Record<string,unknown>).offset))===0?Array.from({length:6},(_,i)=>({...event,eventId:i+7})):[event]));
 const first=await app.runHandler(handler,app.events.privateMessage({text:'/搜索劫云 道号 张  三',platform:'qq-bot'}));
 assert.equal(first.messages.length,1);
 const command=inspectMessage(first.messages[0].nodes).commands.find(c=>c==='/劫云榜 2 道号 张  三');assert.ok(command);
 const last=await app.runHandler(handler,app.events.privateMessage({text:command,platform:'qq-bot'}));
 assert.equal(requests.length,2);assert.equal(last.messages.length,1);
 const message=last.messages[0];assert.equal(last.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
 const view=inspectMessage(message.nodes);assert.match(view.text,/第2页/);
 assert.ok(view.commands.includes('/劫云榜 1 道号 张  三'));assert.ok(!view.commands.some(c=>c.startsWith('/劫云榜 3')));
 assert.ok(view.commands.includes('/劫云榜'));assert.equal(cards(message.nodes).length,1);
 assert.deepEqual(requests.map(r=>(r.body.arguments as Record<string,unknown>).offset),[0,5]);
});
test('空榜提示不创建假条目，后续空页仍能返回上一页',async t=>{
 const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,[]));
 for(const command of ['/劫云榜','/劫云榜 3 UID 101']){
  const result=await app.runHandler(handler,app.events.privateMessage({text:command,platform:'qq-bot'}));
  assert.equal(result.messages.length,1);const message=result.messages[0];assert.equal(result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
  assert.equal(cards(message.nodes).length,0);
  const view=inspectMessage(message.nodes);assert.match(view.text,/当前没有匹配的可观望渡劫事件/);
  assert.equal(view.commands.includes('/劫云榜 2 UID 101'),command.includes(' 3 '));
  assert.ok(!view.commands.some(c=>c.startsWith('/观望渡劫 ')));
 }
 assert.equal(requests.length,2);
});
test('观望详情把捣乱来源增幅与实际落雷攻击区分，并保留同气泡操作', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { ...event, disruption: { count: 10, attackBonusPercent: 10 } }));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/观望渡劫 7', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const [card] = cards(message.nodes);
  assert.ok(card);
  assert.match(card.text, /捣乱来源增幅 \+10%（来源上限10%）/);
  assert.match(card.text, /最终攻击以落雷条件为准/);
  assert.doesNotMatch(card.text, /雷劫双攻击 \+10%/);
  assert.ok(card.commands.includes('/捣乱渡劫 7'));
  assert.ok(card.commands.includes('/参与观望 7'));
});
test('榜单只为他人开放互动的劫云显示捣乱，并使用简短按钮文案', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, [
    event,
    { ...event, eventId: 8, playerId: 1 },
    { ...event, eventId: 9, status: 'preparing', interactionOpen: false, participationOpen: false },
    { ...event, eventId: 10, interactionOpen: false },
    { ...event, eventId: 11, status: 'succeeded', interactionOpen: false, participationOpen: false }
  ]));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/劫云榜', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const rows = cards(message.nodes);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0].commands, ['/参与观望 7', '/捣乱渡劫 7']);
  assert.match(rows[0].text, /增强对方雷劫.*自身渡劫因果/);
  for (const [i, row] of rows.slice(1).entries()) {
    assert.deepEqual(row.commands, i === 0 ? ['/我的渡劫'] : []);
    assert.doesNotMatch(row.text, /捣乱会/);
  }
  const markdown = message.nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown);
  const quote = markdown.value.find(node => node.type === 'MD.blockquote');
  assert.ok(quote && Array.isArray(quote.value));
  assert.deepEqual(quote.value.filter(node => node.type === 'MD.button').map(node => node.value), ['‹观望›', '‹捣乱›']);
});
test('共享分页保留万宝楼已有的总页数和上下页样式',async t=>{
 const app=createTestApp();t.after(()=>app.dispose());
 const result=await app.runHandler(async e=>{
  await useMessage()[0].send(FormatGui({isPrivate:true,bid:e.UserId,title:'万宝楼',content:Format.createMarkdown().addText('物品'),nav:{current:2,total:3,command:'/商店 万宝楼 {page}'}}));
 },app.events.privateMessage({text:'/商店 万宝楼 2'}));
 assert.equal(result.messages.length,1);const message=result.messages[0];assert.equal(result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
 const view=inspectMessage(message.nodes);assert.match(view.text,/第2\/3页/);
 assert.ok(view.commands.includes('/商店 万宝楼 1'));assert.ok(view.commands.includes('/商店 万宝楼 3'));
});

for (const kind of ['participate', 'disrupt']) {
  for (const state of ['granted', 'repeated', 'daily_limit']) {
    test(`榜单按钮直接参与并展示服务端修为回执：${kind}/${state}`, async t => {
      const reward = { baseExperience: 10, creditedExperience: state === 'daily_limit' ? 0 : 10,
        dailyRewarded: state === 'daily_limit' ? 3 : 1, dailyLimit: 3, rewardDate: '2026-10-21',
        reason: state === 'daily_limit' ? 'daily_limit' : 'granted', repeated: state === 'repeated' };
      const { app, requests } = await gameFixture(t, request => {
        const args = request.body.arguments as { kind: string; eventId?: number };
        if (args.kind === 'list') return businessEnvelope(request.bid, [event]);
        assert.equal(args.kind, kind);
        assert.equal(args.eventId, 7);
        return businessEnvelope(request.bid, { eventId: 7, participated: true, reward,
          ...(kind === 'disrupt' ? { summary: { count: 1, attackBonusPercent: 1 } } : {}) });
      });
      const list = await app.runHandler(handler, app.events.groupMessage({ text: '/劫云榜', platform: 'qq-bot' }));
      assert.equal(list.messages.length, 1);
      assert.equal(list.actions[list.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      const [card] = cards(list.messages[0].nodes);
      assert.match(card.text, /每日最多3场，同场共享一次奖励/);
      const command = card.commands.find(value => value.startsWith(kind === 'participate' ? '/参与观望 ' : '/捣乱渡劫 '));
      assert.ok(command);
      const result = await app.runHandler(participationHandler, app.events.groupMessage({ text: command, platform: 'qq-bot' }));
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(message.nodes);
      assert.match(view.text, state === 'daily_limit' ? /当日3场奖励已领满/ : state === 'repeated' ? /本场已获得修为 \+10，本次未重复发放/ : /修为 \+10，已即时到账/);
      assert.deepEqual(cards(message.nodes)[0].commands, ['/劫云榜']);
      assert.ok(!view.commands.includes('/观望渡劫 7'));
      assert.deepEqual(requests.map(request => (request.body.arguments as { kind: string }).kind), ['list', kind]);
    });
  }
}
