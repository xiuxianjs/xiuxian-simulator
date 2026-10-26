import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger, useMessage } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { flyMailNoticeData, flyMailTime } from '../../src/utils/flyMailPresentation';
import { parseFlyMailSendCommand } from '../../src/utils/flyMailCommand';
import historyHandler from '../../src/response/notification/history/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const notice = { messageId: 3, conversationId: 41, scope: 'friend', senderUid: 5, senderName: '清霜', content: '秘境见', createdAt: '2026-10-20T09:00:00+08:00' };

test('收到飞信按各自范围回复，按钮在正文后且仅预填，旧载荷不猜目标', async t => {
  const app = createTestApp(); t.after(() => app.dispose());
  for (const [scope, command] of [['friend', '/发飞信 5 '], ['companion', '/发道侣飞信 '], ['guild', '/发宗门飞信 '], ['master', '/发师门飞信 '], ['team', '/发队伍飞信 ']]) {
    const result = await app.runHandler(async () => {
      const data = flyMailNoticeData({ ...notice, scope }, 1); assert.ok(data);
      const [message] = useMessage(); await message.send(data);
    }, app.events.privateMessage({ platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.commands.includes(command));
    const quotes = result.messages[0].nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []);
    assert.equal(quotes.length, 1);
    const quote = quotes[0];
    assert.ok(Array.isArray(quote.value));
    const text = inspectMessage([{ type: 'Markdown', value: quote.value }]);
    assert.ok(text.text.indexOf('秘境见') < text.text.indexOf('回复'));
    assert.ok(quote.value.some(node => node.type === 'MD.button' && !node.options?.autoEnter));
  }
  assert.equal(flyMailNoticeData({ messageId: 1, conversationId: 41 }, 1), undefined);
  assert.equal(flyMailNoticeData({ ...notice, senderUid: 1 }, 1), undefined);
});

test('通知历史飞信保留正文和回复，隐藏投递状态，旧通知仍展示原文', async t => {
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, { page: 1, hasNext: false, items: [
    { id: 'mail', time: notice.createdAt, text: '旧文本', delivery: '已保存在此处', flymail: notice },
    { id: 'legacy', time: notice.createdAt, text: '旧通知正文', delivery: '历史记录' }
  ] }));
  const result = await app.runHandler(historyHandler, app.events.privateMessage({ text: '/我的通知', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /清霜.*09:00/);
  assert.match(view.text, /秘境见/);
  assert.doesNotMatch(view.text, /已保存在此处|历史记录/);
  assert.match(view.text, /旧通知正文/);
  assert.ok(view.commands.includes('/发飞信 5 '));
  assert.ok(view.commands.includes('/飞信 会话 41'));
});

test('草稿会话标记和游戏时区日期不丢失', () => {
  assert.equal(parseFlyMailSendCommand('/发宗门飞信 [会话:41] 明晚见')?.originConversationId, 41);
  assert.equal(parseFlyMailSendCommand('/发宗门飞信 [会话:41] 明晚见')?.content, '明晚见');
  assert.equal(parseFlyMailSendCommand('/发宗门飞信 普通内容')?.originConversationId, undefined);
  assert.equal(flyMailTime('2026-10-20T01:00:00Z', '2026-10-20T13:00:00+08:00'), '09:00');
  assert.equal(flyMailTime('2026-10-19T09:00:00+08:00', '2026-10-20'), '10-19 09:00');
  assert.equal(flyMailTime('2025-10-19T09:00:00+08:00', '2026-10-20'), '2025-10-19 09:00');
});

test('群内通知历史隐藏飞信正文与旧管理员告警，不提供会话或回复按钮',async t=>{
 const {app}=await gameFixture(t,r=>businessEnvelope(r.bid,{page:1,hasNext:false,items:[
 {id:'flymail.message:3:received:1',time:notice.createdAt,text:'秘密旧正文',delivery:'已保存',flymail:notice},
 {id:'flymail.subscription.required:4',time:notice.createdAt,text:'秘密管理员正文',delivery:'已保存'}]}));
 const result=await app.runHandler(historyHandler,app.events.groupMessage({text:'/我的通知',platform:'qq-bot'}));
 assert.deepEqual(result.errors,[]);assert.equal(result.messages.length,1);
 const view=inspectMessage(result.messages[0].nodes);assert.doesNotMatch(view.text,/秘密|清霜|秘境见|09:00/);
 assert.ok(!view.commands.some(c=>c.startsWith('/飞信')||c.startsWith('/发')));
});

test('旧管理员告警在管理员私聊历史中也不再展开他人的通话',async t=>{
 const {app}=await gameFixture(t,r=>businessEnvelope(r.bid,{page:1,hasNext:false,items:[{id:'flymail.subscription.required:9',time:notice.createdAt,text:'秘密转发正文',delivery:'已保存',flymail:notice}]}));
 const result=await app.runHandler(historyHandler,app.events.privateMessage({text:'/我的通知',platform:'qq-bot'}));
 assert.deepEqual(result.errors,[]);assert.equal(result.messages.length,1);
 const view=inspectMessage(result.messages[0].nodes);assert.match(view.text,/已停用/);assert.doesNotMatch(view.text,/秘密|清霜|秘境见/);assert.ok(!view.commands.some(c=>c.startsWith('/发')||c.startsWith('/飞信')));
});
