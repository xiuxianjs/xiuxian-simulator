import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { onResponse, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';

import soulUpgrade from '../../src/response/soulArtifact/upgrade/res';
import promotion from '../../src/response/promotion/perform/res';
import breakthrough from '../../src/response/breakthrough/perform/res';
import consume from '../../src/response/consume/res';
import playerEntry from '../../src/response/mw';
import { selects } from '../../src/response/config';
import { parseRobotMiddlewareResult } from '../../src/api/bot/middleware-entry';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => {
  mock.timers.reset();
  await shutdownLogger();
});

for (const entry of [
  { handler: soulUpgrade, command: '/本命物升级', reason: '金丹及以上方可升级本命物' }
]) {
  for (const privateChat of [true, false]) {
    test(`入口境界拦截保留原因并给出成长步骤：${entry.command} ${privateChat}`, async t => {
      const { app, requests } = await gameFixture(t, request => {
        const envelope = businessEnvelope(request.bid, undefined, [
          { title: '提醒', heading: '', text: '此前提醒', buttons: [], advice: [] },
          { title: '操作未完成', heading: '', text: '玩家入口处理未完成，请稍后再试。', buttons: [], advice: [] }
        ]);
        return {
          ...envelope,
          branch: 'middleware',
          middleware: {
            ...envelope.middleware,
            outcome: 'reject',
            reason: 'ENTRY_FAILED',
            entry: {
              ...envelope.middleware.entry,
              routeAllowed: false,
              featureGuard: { blocked: true, feature: 'cultivation', reason: entry.reason, realmName: '炼气一层' }
            }
          }
        };
      });
      const event = privateChat
        ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })
        : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
      const result = await app.runHandler(entry.handler, event);
      assert.equal(requests.length, 1);
      assert.equal(result.nextCalls.length, 0);
      assert.equal(result.messages.length, 2);
      assert.ok(result.messages[0].text.includes('此前提醒'));
      assert.ok(!result.messages[1].text.includes('玩家入口处理未完成'));
      const view = inspectMessage(result.messages[1].nodes);
      assert.ok(view.text.includes(entry.reason));
      assert.ok(view.text.includes('炼气一层'));
      assert.ok(view.text.includes('三星通关'));
      assert.ok(view.text.includes('核对当前修为和所需材料'));
      for (const command of ['/我的信息', '/查看主线', '/我的境界', '/闭关']) assert.ok(view.commands.includes(command), JSON.stringify(view));
      assert.ok(!view.commands.includes('/突破'), '不根据境界不足直接触发突破消耗');
      assert.ok(!view.commands.includes('/晋级'), '先查看要求，再由玩家选择');
      for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
}

for (const entry of [
  { handler: consume, command: '/服用 筑基丹', reason: '筑基丹需达到炼气九层方可服用' },
  { handler: soulUpgrade, command: '/本命物升级', reason: '当前等级 10 已达金丹上限 10' },
  { handler: promotion, command: '/晋级', reason: '当前境界未达到晋级要求' },
  { handler: breakthrough, command: '/突破', reason: '修为不足，当前修为: 20/100' }
]) {
  test(`业务内限制也给出成长路径：${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, () => ({ code: 'CONFLICT', message: entry.reason }), 409);
    const result = await app.runHandler(entry.handler, app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    for (const command of ['/查看主线', '/我的境界', '/闭关']) assert.ok(view.commands.includes(command));
    assert.ok(view.text.includes('精力等条件'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const entry of [
  { reason: '当前最高开放境界为「化神圆满」；更高境界尚未开放，请等待后续更新。', forbidden: ['/查看主线', '/闭关'], required: ['/我的境界'] },
  { reason: '当前小境界已达上限，请尝试晋级', forbidden: ['/查看主线', '/闭关'], required: ['/我的境界'] },
  { reason: '晋级材料不足', forbidden: ['/晋级'], required: ['/我的境界', '/储物袋', '/珍宝楼'] }
]) {
  test(`不同中断条件不混用修炼建议：${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, () => ({ code: 'CONFLICT', message: entry.reason }), 409);
    const result = await app.runHandler(promotion, app.events.groupMessage({ text: '/晋级', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    for (const command of entry.required) assert.ok(view.commands.includes(command));
    for (const command of entry.forbidden.filter(command => !['/我', '/属性面板', '/查看主线', '/我的活动', '/商店'].includes(command))) assert.ok(!view.commands.includes(command));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('原入口兜底复用成长建议，保留此前提醒且不发起新业务请求', async t => {
  const { app, requests } = await gameFixture(t, () => {
    throw Error('must not request');
  });
  const handler = onResponse(selects, async event => {
    const envelope = businessEnvelope(event.UserId, undefined, [
      { title: '提醒', heading: '', text: '原入口提醒', buttons: [], advice: [] },
      { title: '错误', heading: '', text: '玩家入口处理未完成', buttons: [], advice: [] }
    ]);
    await playerEntry(event, parseRobotMiddlewareResult({
      ...envelope.middleware,
      outcome: 'reject',
      reason: 'ENTRY_FAILED',
      entry: { ...envelope.middleware.entry, routeAllowed: false, featureGuard: { blocked: true, reason: '境界不足', realmName: '炼气一层' } }
    }, event.UserId));
  });
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/经络', platform: 'qq-bot' }));
  assert.equal(requests.length, 0);
  assert.equal(result.messages.length, 2);
  const view = inspectMessage(result.messages[1].nodes);
  assert.ok(view.text.includes('境界不足'));
  assert.ok(view.commands.includes('/查看主线'));
  assert.ok(view.commands.includes('/我的境界'));
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});
