import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/flyMail/send/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const item = (id: number, senderUid: number, senderName: string, content: string) => ({ kind: 'message', id, scope: 'friend', senderUid, senderName, content, createdAt: `2026-10-20T11:51:0${id}+08:00`, conversationId: 41, title: '' });
const sent = () => ({ success: true, message: '好友飞信发送成功，收件人：柳如烟', chat: {
  conversationId: 41, targetUid: 1000005,
  history: { scope: 'friend', page: 1, total: 3, totalPage: 1, access: { allowed: true, realmName: '炼气五层', realmLevel: 5 }, muteList: [],
    list: [item(3, 1, '韩立', '在吗在吗'), item(2, 1000005, '柳如烟', '你好'), item(1, 1, '韩立', '你好哟')] }
} });

for (const privateChat of [true]) {
  test(`发送后按时间展示当前会话并回复正确好友（${privateChat ? '私聊' : '群聊'}）`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, sent()));
    const event = privateChat ? app.events.privateMessage({ text: '/发飞信 1000005 在吗在吗', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/发飞信 1000005 在吗在吗', platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/business/flymail.send');
    assert.deepEqual(requests[0].body.arguments, { scope: 'friend', target: { uid: 1000005 }, content: '在吗在吗' });
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.doesNotMatch(view.text, /发送成功|返回飞信/);
    assert.deepEqual(view.commands, ['/飞信', '/发飞信 1000005 ', '/发飞信 1000005 ']);
    const quotes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []);
    assert.equal(quotes.length, 3);
    for (const [index, [name, content]] of [['我', '你好哟'], ['柳如烟', '你好'], ['我', '在吗在吗']].entries()) {
      const quote = quotes[index];
      if (quote.type !== 'MD.blockquote' || !Array.isArray(quote.value)) throw new Error('Expected quote nodes');
      const detail = inspectMessage([{ type: 'Markdown', value: quote.value }]);
      assert.match(detail.text, new RegExp(name));
      assert.match(detail.text, new RegExp(content));
      assert.match(detail.text, /11:51/);
      assert.deepEqual(detail.commands, index === 1 ? ['/发飞信 1000005 '] : []);
      if (index === 1) {
        assert.ok(detail.text.indexOf(content) < detail.text.indexOf('回复'));
        assert.ok(quote.value.some(node => node.type === 'MD.button' && !node.options?.autoEnter));
      }
    }
  });
}

test('历史缺失或会话不匹配时保留发送成功，不泄露其他会话也不重复发送', async t => {
  let invalid = false;
  const { app, requests } = await gameFixture(t, r => {
    const data = sent();
    if (invalid) data.chat.history.list[0] = { ...data.chat.history.list[0], conversationId: 99, content: '其他会话正文' };
    return businessEnvelope(r.bid, invalid ? data : { success: true, message: data.message });
  });
  for (let i = 0; i < 2; i++) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: '/发飞信 1000005 在吗在吗', platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.match(view.text, /飞信已发送/);
    assert.doesNotMatch(view.text, /其他会话正文|发送失败/);
    invalid = true;
  }
  assert.equal(requests.length, 2);
});

test('组织和道侣草稿只含发送指令，由服务端解析当前关系', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { success: true, message: '已保存', conversationId: 41, targetUid: 0 }));
  for (const [label, scope] of [['师门', 'master'], ['宗门', 'guild'], ['队伍', 'team'], ['道侣', 'companion']]) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: `/发${label}飞信 明晚见`, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(requests.at(-1)?.path, '/api/v2/robot/business/flymail.send');
    assert.deepEqual(requests.at(-1)?.body.arguments, { scope, target: null, content: '明晚见' });
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.commands.includes(`/发${label}飞信 `));
    assert.ok(view.commands.every(command => !command.includes('[会话:')));
  }
});

test('旧版带编号的组织和道侣回复仍校验原会话，后续草稿不带编号', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { success: true, message: '已保存', conversationId: 41, targetUid: 0 }));
  for (const [label, scope] of [['师门', 'master'], ['宗门', 'guild'], ['队伍', 'team'], ['道侣', 'companion']]) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: `/发${label}飞信 [会话:41] 明晚见`, platform: 'qq-bot' }));
    assert.equal(requests.at(-1)?.path, '/api/v2/robot/business/flymail.reply');
    assert.deepEqual(requests.at(-1)?.body.arguments, { scope, target: null, content: '明晚见', originConversationId: 41 });
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.ok(inspectMessage(result.messages[0].nodes).commands.includes(`/发${label}飞信 `));
  }
});

test('发送接口中断只引导查看，不暴露异常也不提供重复发送按钮', async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('socket lost after commit'); });
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/发飞信 1000005 你好', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /结果待确认/);
  assert.doesNotMatch(view.text, /socket|重新发送/);
  assert.deepEqual(view.commands, ['/飞信']);
});

test('明确拒绝保留原收件人与正文，收信人屏蔽时不提供解除操作', async t => {
  let blocked = false;
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, undefined, [{ title: '飞信', heading: '',
    text: blocked ? '对方已禁言你的飞信' : '内容长度不能超过200个字符', advice: [],
    buttons: blocked ? [] : [{ label: '重新编辑', command: '/发飞信 5 原正文' }]
  }]));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/发飞信 5 原正文', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.ok(inspectMessage(result.messages[0].nodes).commands.includes('/发飞信 5 原正文'));
  blocked = true;
  const refused = await app.runHandler(handler, app.events.privateMessage({ text: '/发飞信 5 原正文', platform: 'qq-bot' }));
  assert.equal(refused.messages.length, 1);
  assert.equal(refused.actions[refused.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(refused.messages[0].nodes);
  assert.match(view.text, /对方已屏蔽你的飞信/);
  assert.deepEqual(view.commands, ['/飞信']);
});

 test('群内发送回显只确认操作，不展开历史或预填正文', async t => {
  const {app}=await gameFixture(t,r=>businessEnvelope(r.bid,sent()));
  const result=await app.runHandler(handler,app.events.groupMessage({text:'/发飞信 1000005 在吗在吗',platform:'qq-bot'}));
  assert.deepEqual(result.errors,[]); assert.equal(result.messages.length,1);
  const view=inspectMessage(result.messages[0].nodes);
  assert.match(view.text,/私聊机器人/); assert.doesNotMatch(view.text,/柳如烟|在吗在吗|你好|1000005/); assert.deepEqual(view.commands,[]);
 });

test('超长飞信编辑按钮保留收件人但不携带被截断的正文', async t => {
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, undefined, [{ title: '飞信', heading: '', text: '内容长度不能超过200个字符', advice: [], buttons: [{ label: '重新编辑', command: '/发飞信 5 ' + '长'.repeat(201) }] }]));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/发飞信 5 ' + '长'.repeat(201), platform: 'qq-bot' }));
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const commands = inspectMessage(result.messages[0].nodes).commands;
  assert.ok(commands.includes('/发飞信 5 '));
  assert.ok(commands.every(command => [...command].length <= 80));
});
