import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import triple from '../../src/response/robbery/triple/res';
import targets from '../../src/response/pkTargets/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

function receipt(index: number, qiCost = 25) {
  return {
    pkRulesVersion: 1, pkEventId: 70 + index, actorSide: 'B', won: index !== 2,
    pkState: 'waiting', pkDeliveryState: 'pending', counterDeadline: '2026-10-21T18:00:00+08:00',
    winner: index === 2 ? 'A' : 'B', attackerName: '我', targetName: '道友',
    battleLogId: `battle-${index}`, logId: 70 + index, qiCost, remaining: 14 - index, dailyMax: 14,
    stoneReward: index === 1 ? 100 : index === 3 ? 40 : 0, crystalReward: 0,
    shaQiChange: 1, currentShaQi: index, experience: index === 2 ? 208 : 250,
    bonusText: '', losingStreakText: '', droppedItem: index === 1 ? { name: '青锋剑', quantity: 1 } : null
  };
}
function assertSent(result: Awaited<ReturnType<Awaited<ReturnType<typeof gameFixture>>['app']['runHandler']>>) {
  assert.ok(result.messages.length > 0);
  for (const m of result.messages) assert.equal(result.actions[m.actionIndex].results?.[0].code, ResultCode.Ok);
  const summary = result.messages.find(message => inspectMessage(message.nodes).text.includes('已确认完成'));
  return inspectMessage((summary ?? result.messages[result.messages.length - 1]).nodes);
}

for (const privateChat of [true, false]) {
  test(`三连按实际境界消耗汇总，败场继续，奖励和战报各自保留（${privateChat ? '私聊' : '群聊'}）`, async t => {
    let count = 0;
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, receipt(++count)));
    const event = privateChat ? app.events.privateMessage({ text: '/三连打劫 2', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/三连打劫 2', platform: 'qq-bot' });
    const result = await app.runHandler(triple, event);
    assert.equal(requests.length, 3);
    assert.equal(new Set(requests.map(r => r.idempotencyKey)).size, 3);
    for (const r of requests) {
      assert.equal(r.path, '/api/v2/robot/business/pvp.robbery');
      assert.deepEqual(r.body.arguments, { target: { uid: 2 } });
      assert.equal(r.body.messageText, '/三连打劫 2');
      assert.ok(r.idempotencyKey);
    }
    assert.equal(result.messages.length, 2);
    const memory = result.messages[1].nodes.flatMap(node => node.type === 'BT.group' ? node.value.flatMap(row => row.value) : []);
    assert.deepEqual(memory.map(button => button.options?.data), [1, 2, 3].map(index => `https://tatian-online.alemonjs.com/components/battle-memory/battle-${index}`));
    const view = assertSent(result);
    assert.match(view.text, /已确认完成 3\/3 次/);
    assert.match(view.text, /第2次 · 道友 · 打劫失败/);
    assert.match(view.text, /灵石\+100/); assert.match(view.text, /灵石\+40/);
    assert.match(view.text, /修为 \+208/); assert.match(view.text, /暂存：青锋剑×1（尚未到手）/);
    assert.match(view.text, /已确认消耗元力 75 · 今日剩余11\/14次/);
    for (let i = 1; i <= 3; i++) {
      assert.ok(view.commands.includes(`/争夺战报 ${70 + i}`));
      assert.ok(view.commands.includes(`/争夺回放 ${70 + i} 原战 1`));
    }
    const quotes = result.messages[0].nodes?.flatMap(n => n.type === 'Markdown' ? n.value.filter(c => c.type === 'MD.blockquote') : []) ?? [];
    assert.equal(quotes.length, 3);
    for (const q of quotes) {
      assert.ok(Array.isArray(q.value));
      const card = inspectMessage([{ type: 'Markdown', value: q.value as never }]);
      assert.equal(card.commands.filter(c => c.startsWith('/争夺战报')).length, 1);
    }
  });
}

test('同一平台事件重放使用同一组分场幂等键，新消息使用新键', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, receipt(1)));
  const event = app.events.privateMessage({ text: '/三连打劫 2', platform: 'qq-bot' });
  await app.runHandler(triple, event);
  await app.runHandler(triple, event);
  assert.deepEqual(requests.slice(0, 3).map(r => r.idempotencyKey), requests.slice(3, 6).map(r => r.idempotencyKey));
  await app.runHandler(triple, app.events.privateMessage({ text: '/三连打劫 2', platform: 'qq-bot' }));
  assert.notEqual(requests[0].idempotencyKey, requests[6].idempotencyKey);
});

for (const reason of ['元力不足，打劫需要25点元力', '今日对该目标普通打劫已达5次', '目标仍在受袭保护期内']) {
  test(`中途拒绝停止后续请求并保留前一场：${reason}`, async t => {
    let count = 0;
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, ++count === 1 ? receipt(1) : undefined, count === 1 ? [] : [{ title: '', heading: '', text: reason, buttons: [], advice: [] }]));
    const result = await app.runHandler(triple, app.events.privateMessage({ text: '/三连打劫 2', platform: 'qq-bot' }));
    assert.equal(requests.length, 2);
    const view = assertSent(result);
    assert.match(view.text, /已确认完成 1\/3 次/);
    assert.match(view.text, /已确认消耗元力 25/);
    assert.ok(result.messages.some(m => inspectMessage(m.nodes).text.includes(reason)));
    assert.ok(view.commands.includes('/争夺战报 71'));
  });
}

test('每日次数耗尽直接结束，汇总使用各次回执元力', async t => {
  let count = 0;
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { ...receipt(++count, count === 1 ? 20 : 25), remaining: 2 - count }));
  const view = assertSent(await app.runHandler(triple, app.events.privateMessage({ text: '/三连打劫 2', platform: 'qq-bot' })));
  assert.equal(requests.length, 2);
  assert.match(view.text, /已确认消耗元力 45/);
  assert.match(view.text, /今日打劫次数已用完/);
});

test('第二场回执损坏时不重试或继续，不把未知结算说成失败', async t => {
  let count = 0;
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, ++count === 1 ? receipt(1) : { qiCost: null }));
  const view = assertSent(await app.runHandler(triple, app.events.privateMessage({ text: '/三连打劫 2', platform: 'qq-bot' })));
  assert.equal(requests.length, 2);
  assert.match(view.text, /第2次打劫结果暂未确认/);
  assert.match(view.text, /已确认消耗元力 25/);
  assert.ok(view.commands.includes('/打劫记录'));
});

test('缺少目标不写入，缺少真实消息标识不写入', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, receipt(1)));
  app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
  const missingTarget = assertSent(await app.runHandler(triple, app.events.privateMessage({ text: '/三连打劫', platform: 'qq-bot' })));
  assert.match(missingTarget.text, /三连打劫 UID/);
  const event = app.events.privateMessage({ text: '/三连打劫 2', platform: 'qq-bot' });
  Object.assign(event, { MessageId: '', InteractionId: '' });
  const missingId = assertSent(await app.runHandler(triple, event));
  assert.match(missingId.text, /消息缺少有效标识/);
  assert.equal(requests.length, 0);
});

test('可打劫道友入口提供三连按钮，剩一次时也可按实际次数执行', async t => {
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, { mode: 'active', canAttack: true, reason: '', qiCost: 25, dailyRemaining: 8, dailyLimit: 14, items: [{ uid: 2, name: '道友', realmName: '元婴', sameTargetRemaining: 1, pairOrdinal: 5, rewardPercent: 20, itemChancePercent: 12 }] }));
  const view = assertSent(await app.runHandler(targets, app.events.privateMessage({ text: '/可打劫道友', platform: 'qq-bot' })));
  assert.ok(view.commands.includes('/三连打劫 2'));
});

test('@目标仅解析一次并在三场中复用平台身份，不预查玩家身份', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, receipt(1)));
  app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'Target mention', [{ UserId: 'target-bid', IsBot: false }])]);
  const result = await app.runHandler(triple, app.events.groupMessage({ text: '/三连打劫 @道友', platform: 'qq-bot' }));
  assertSent(result);
  assert.equal(requests.length, 3);
  assert.equal(result.actions.filter(a => a.name === 'mention.get').length, 1);
  for (const r of requests) assert.deepEqual(r.body.arguments, { target: { bid: 'target-bid' } });
});

test('交互按钮以真实交互标识生成三个不同幂等键', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, receipt(1)));
  assertSent(await app.runHandler(triple, app.events.interaction({ text: '/三连打劫 2', platform: 'qq-bot', private: true })));
  assert.equal(requests.length, 3);
  assert.equal(new Set(requests.map(r => r.idempotencyKey)).size, 3);
});

test('首场业务拒绝保留原文，不继续请求', async t => {
  const reason = '不能打劫自己';
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }]));
  const view = assertSent(await app.runHandler(triple, app.events.privateMessage({ text: '/三连打劫 1', platform: 'qq-bot' })));
  assert.equal(requests.length, 1);
  assert.match(view.text, /已确认完成 0\/3 次/);
  assert.ok(view.text.includes(reason));
  assert.doesNotMatch(view.text, /已确认消耗元力/);
});

test('HTTP业务拒绝停止，不进行后续战斗', async t => {
  const { app, requests } = await gameFixture(t, () => ({ code: 'CONFLICT', message: '目标仍在受袭保护期内' }), 409);
  const result = await app.runHandler(triple, app.events.privateMessage({ text: '/三连打劫 2', platform: 'qq-bot' }));
  assertSent(result);
  assert.equal(requests.length, 1);
  assert.ok(result.messages.some(m => inspectMessage(m.nodes).text.includes('目标仍在受袭保护期内')));
});
