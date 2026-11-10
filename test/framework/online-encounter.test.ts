import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

test('奇遇先送达活动总览，再异步发盲选气泡，选完揭晓原奖励', async t => {
  const order: string[] = [];
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/online-encounter.check')) {
      order.push('check');
      return businessEnvelope(request.bid, {
        triggered: true, nextCheckAt: '2099-11-10T11:15:00Z', nextGameDayAt: '2099-11-10T16:00:00Z', quotaExhausted: false,
        pending: { id: '18446744073709551615', title: '药农还礼', intro: '药农留下了两样谢礼。', options: ['取布袋', '取纸包'], expiresAt: '2099-11-10T11:15:00Z' }
      });
    }
    if (request.path.endsWith('/online-encounter.claim')) {
      assert.deepEqual(request.body.arguments, { id: '18446744073709551615', choice: 1 });
      return businessEnvelope(request.bid, { title: '药农还礼', reveal: '你解开了布袋。', reward: { name: '灵肥', quantity: 1 } });
    }
    return businessEnvelope(request.bid, {
      limitedEvent: { activeCount: 0 }, guildCompetition: { phase: '' }, newcomerVisible: false, giftCodesVisible: false,
      guildSecretRealmWar: { phase: '', activeStartAt: '', activeEndAt: '', maxAttackPerWeek: 0, remainingAttackCount: 0 },
      access: { hasGuild: false, canAccessOverseasIsland: false }
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  let failPanel = true;
  app.actions.on('message.send', () => {
    if (failPanel) return [createResult(ResultCode.Fail, '未送达')];
    order.push('send');
    return [createResult(ResultCode.Ok, '已送达', { id: 'encounter-receipt' })];
  });

  const failed = await app.dispatch(app.events.privateMessage({ text: '/我的活动', platform: 'qq-bot' }));
  assert.equal(failed.actions[failed.messages[0].actionIndex].results?.[0].code, ResultCode.Fail);
  assert.equal(requests.filter(request => request.path.endsWith('/online-encounter.check')).length, 0);
  failPanel = false;

  const panel = await app.dispatch(app.events.privateMessage({ text: '/我的活动', platform: 'qq-bot' }));
  assert.deepEqual(order, ['send', 'check', 'send']);
  assert.deepEqual(panel.errors, []);
  const markup = JSON.stringify(panel.messages.flatMap(message => message.nodes));
  const button = '/奇遇选择 18446744073709551615 1';
  assert.ok(markup.includes(button));
  assert.ok(!markup.includes('灵肥'));
  assert.ok([...button].length <= 80);
  for (const message of panel.messages) assert.equal(panel.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);

  const claim = await app.dispatch(app.events.privateMessage({ text: button, platform: 'qq-bot' }));
  assert.deepEqual(claim.errors, []);
  assert.equal(claim.messages.length, 1);
  assert.equal(claim.actions[claim.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.match(JSON.stringify(claim.messages[0].nodes), /灵肥 ×1/);

  await app.dispatch(app.events.privateMessage({ text: '/我的活动', platform: 'qq-bot' }));
  assert.equal(requests.filter(request => request.path.endsWith('/online-encounter.check')).length, 1);
});
