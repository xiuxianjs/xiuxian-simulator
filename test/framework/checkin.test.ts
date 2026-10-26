import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { Router, shutdownLogger, ResultCode, createResult } from 'alemonjs';
import hub from '../../src/response/signIn/hub/res';
import newcomer from '../../src/response/activity/newcomerLoginClaim/res';
import { businessEnvelope, gameFixture } from './fixture';

// The project analytics batcher owns native timers, outside app.clock. Keep them
// paused for this serial suite; reset discards pending analytics flushes at exit.
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => {
  mock.timers.reset();
  await shutdownLogger();
});
const partial = {
  results: [
    { name: '日常签到', status: 'done', message: '签到成功（累计3天）\n获得：签到币 ×25' },
    { name: '新人签到', status: 'error', message: '加载失败' },
    { name: '宗门签到', status: 'skip', message: '不可用' }
  ]
};

for (const privateChat of [false, true]) {
  test(`真实统一签到处理器保留部分失败及重试按钮（${privateChat ? '私聊' : '群聊'}）`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, partial));
    const event = privateChat
      ? app.events.privateMessage({ text: '/签到', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/签到', platform: 'qq-bot' });
    const result = await app.runHandler(hub, event);
    assert.equal(requests.length, 1, '一次指令只提交一次业务请求');
    assert.equal(requests[0].path, '/api/v2/robot/business/checkin.hub');
    assert.ok(requests[0].idempotencyKey);
    assert.equal(requests[0].body.messageText, '/签到');
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    for (const text of ['🎉 日常签到：签到成功', '获得：签到币 ×25', '❌ 新人签到：加载失败', '· 宗门签到：不可用']) assert.ok(message.text.includes(text), message.text);
    for (const command of ['/新人签到', '/商店 签到', '/任务面板', '/我']) assert.ok(message.commands.includes(command), command);
    assert.equal(message.commands.includes('/日常签到'), false, '成功项不提供重试');
    assert.equal(message.commands.includes('/宗门签到'), false, '跳过项不提供重试');
    assert.equal(message.target?.targetId, privateChat ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('后端业务拒绝只展示原气泡一次，不重新提交签到', async t => {
  const reply = { title: '签到', heading: '', text: '今日签到暂不可用', buttons: [], advice: [] };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [reply]));
  const result = await app.runHandler(hub, app.events.privateMessage({ text: '/签到', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  assert.ok(result.messages[0].text.includes(reply.text));
  assert.ok(result.messages[0].commands.includes('/任务面板'));
});

test('真实新人签到处理器展示奖励并提供当天历练入口', async t => {
  const data = { code: 'OK', data: { claimDay: 1, spiritCrystal: 8, grantedItems: ['灵草×2'] } };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(newcomer, app.events.privateMessage({ text: '/初入仙途签到', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/checkin.newcomer-login');
  assert.equal(result.messages.length, 1);
  for (const text of ['第1天修行完成', '灵晶×8', '灵草×2']) assert.ok(result.messages[0].text.includes(text));
  assert.ok(result.messages[0].commands.includes('/初入仙途 1'));
});

for (const [code, expected] of [
  ['ALL_CLAIMED', '全部7天签到'],
  ['NO_CLAIMABLE', '前6天错过不可补领']
]) {
  test(`新人签到 ${code} 不展示虚假奖励`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { code }));
    const result = await app.runHandler(newcomer, app.events.privateMessage({ text: '/初入仙途签到', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    assert.ok(result.messages[0].text.includes(expected));
    assert.equal(result.messages[0].text.includes('获得：'), false);
  });
}

test('模拟平台拒绝发送时，消息记录与发送结果都可检查', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, partial));
  app.actions.on('message.send', () => [createResult(ResultCode.Fail, '平台拒绝发送', null)]);
  const result = await app.runHandler(hub, app.events.privateMessage({ text: '/签到', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1, '记录的是发送尝试');
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Fail);
});

test('挂载真实处理器后，路由分发执行签到；同一消息去重且不重复写入', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, partial));
  const router = Router.create({ events: ['message.create'] });
  router.use('签到', async () => ({ default: hub }));
  await app.mount({ responseRouter: router.define });
  const event = app.events.groupMessage({ text: '签到', platform: 'qq-bot' });
  const first = await app.dispatch(event);
  assert.equal(first.messages.length, 1);
  const duplicate = await app.dispatch({ ...event });
  assert.equal(duplicate.messages.length, 0);
  assert.equal(requests.length, 1);
  assert.ok(duplicate.reasons.includes('filtered'));
});
