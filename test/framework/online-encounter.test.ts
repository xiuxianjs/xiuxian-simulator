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
    if (request.path.endsWith('/storage.menu')) return businessEnvelope(request.bid, { message: '储物袋总览' });
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

  const bag = await app.dispatch(app.events.privateMessage({ text: '/背包', platform: 'qq-bot' }));
  assert.equal(bag.messages.length, 1);
  assert.match(bag.messages[0].text, /储物袋总览/);
  assert.equal(requests.filter(request => request.path.endsWith('/online-encounter.check')).length, 1);
});

const noEncounter = { triggered: false, pending: null, nextCheckAt: '2099-11-10T11:15:00Z', nextGameDayAt: '2099-11-10T16:00:00Z', quotaExhausted: false };

for (const scenario of [
  { command: '/一键打理灵田', operation: 'cave.tend-all', panel: 'cave-tend', text: '收获：聚灵草 ×3',
    data: { message: '浇灌：2 项\n除虫：0 项\n除草：1 项\n结果：收割 1 块灵田\n收获：聚灵草 ×3' } },
  { command: '/主线扫荡 1-1 5', operation: 'storyline.sweep', panel: 'storyline-sweep', text: '扫荡完成', onboardingPending: true,
    data: { chapterNumber: 1, stageNumber: 1, result: { stageLabel: '第一关', times: 5, totalSpiritCost: 5, totalExp: 100,
      totalSpiritStone: 10, totalBonusExp: 0, expBonusText: '', allItemsGained: [] } } },
  { command: '/主线挑战 1-1', operation: 'storyline.challenge', panel: 'storyline-challenge', text: '主线结算',
    data: { sessionId: 'finished', finished: true, winner: 'A', events: [], settlement: { chapterNumber: 1, stageNumber: 1, stageLabel: '第一关' } } }
]) {
  test(`${scenario.command} 只在最终消息确认送达后检查一次奇遇`, async t => {
    const order: string[] = [];
    const { app, requests } = await gameFixture(t, request => {
      if (request.path.endsWith('/online-encounter.check')) {
        order.push('check');
        return businessEnvelope(request.bid, noEncounter);
      }
      assert.ok(request.path.endsWith('/' + scenario.operation), request.path);
      return { ...businessEnvelope(request.bid, scenario.data), ...(scenario.onboardingPending ? { onboardingPending: true } : {}) };
    });
    await app.mount({ responseRouter: app.run(createGameRouter).router });
    app.actions.on('message.send', () => {
      order.push('send');
      return [createResult(ResultCode.Ok, '已送达', { id: 'settlement-receipt' })];
    });

    const result = await app.dispatch(app.events.privateMessage({ text: scenario.command, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.ok(result.messages[0].text.includes(scenario.text), result.messages[0].text);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.deepEqual(order, ['send', 'check']);
    assert.deepEqual(requests[1]?.body.arguments, { panel: scenario.panel });
  });
}

test('主线手动回合不检查奇遇，最终结算后沿用原挑战入口', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const order: string[] = [];
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/storyline.challenge')) {
      return businessEnvelope(request.bid, { sessionId: 'manual', finished: false, events: [],
        choice: { unitId: 'A', unitName: '道友', side: 'A', round: 1, availableSkills: [{ type: 'normal', name: '普攻', available: true }] } });
    }
    if (request.path.endsWith('/storyline.choice')) {
      return businessEnvelope(request.bid, { sessionId: 'manual', finished: true, winner: 'A', events: [],
        settlement: { chapterNumber: 1, stageNumber: 1, stageLabel: '第一关' } });
    }
    assert.ok(request.path.endsWith('/online-encounter.check'));
    order.push('check');
    return businessEnvelope(request.bid, noEncounter);
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  app.actions.on('message.send', () => {
    order.push('send');
    return [createResult(ResultCode.Ok, '已送达', { id: 'manual-receipt' })];
  });
  const start = await app.dispatch(app.events.privateMessage({ text: '/主线挑战 1-1', platform: 'qq-bot', userId: 'player' }));
  assert.deepEqual(start.errors, []);
  assert.deepEqual(order, ['send']);
  assert.match(start.messages[0].text, /请选择技能/);
  const finish = await app.dispatch(app.events.privateMessage({ text: '/普攻', platform: 'qq-bot', userId: 'player' }));
  assert.deepEqual(finish.errors, []);
  assert.match(finish.messages[0].text, /主线结算/);
  assert.deepEqual(order, ['send', 'send', 'check']);
  assert.equal(requests[2]?.body.messageText, '/主线挑战 1-1');
});

const shopData = {
  access: { hasCompanion: false, isFoundationRealm: false, canUseReputationShop: false, visibleShopCodes: ['CHECKIN'], deniedReason: null },
  currencies: { spiritStone: 0, spiritsCrystal: 0, spiritsMilk: 0, signInCoin: 0, towerScore: 0, reputation: 0, tongxin: 0, greenBottle: 0 },
  products: [], page: 1, totalPages: 1, total: 0
};
const dungeonData = {
  mentalValue: 10, inTeam: false, realmLevel: 1, realmStageLevel: 1, canUseMeridian: false, canMatchDungeon: false,
  currentPage: 1, totalPages: 2, total: 1,
  items: [{ id: 12, name: '幽谷', isSingle: true, hasCleared: true, spiritCost: 3, minRealmName: null, maxRealmName: null }]
};
const dungeonSweep = { dungeonName: '幽谷', times: 5, totalSpiritCost: 15, totalExp: 50, currency: [], items: [] };

for (const source of [
  { command: '/商店', panel: 'shop', data: shopData },
  { command: '/商店 签到', panel: null, data: shopData },
  { command: '/查看秘境', panel: 'dungeon-list', data: dungeonData },
  { command: '/查看秘境 2', panel: null, data: { ...dungeonData, currentPage: 2 } },
  { command: '/扫荡秘境 #12 5', panel: 'dungeon-sweep', data: { outcome: 'result', dungeonId: 12, data: dungeonSweep } },
  { command: '/扫荡免费秘境', panel: 'dungeon-sweep', data: { sweptDungeons: [dungeonSweep], totalTimes: 5, totalExp: 50, totalSpiritCost: 0 } },
  { command: '/扫荡免费秘境', panel: null, data: { sweptDungeons: [], totalTimes: 0, totalExp: 0, totalSpiritCost: 0 } }
]) {
  test(`额外入口 ${source.command} ${source.panel ?? '跳过'}`, async t => {
    const order: string[] = [];
    const { app, requests } = await gameFixture(t, request => {
      if (request.path.endsWith('/online-encounter.check')) {
        order.push('check');
        return businessEnvelope(request.bid, noEncounter);
      }
      return businessEnvelope(request.bid, source.data);
    });
    await app.mount({ responseRouter: app.run(createGameRouter).router });
    app.actions.on('message.send', () => {
      order.push('send');
      return [createResult(ResultCode.Ok, '已送达', { id: 'extra-source-receipt' })];
    });

    const result = await app.dispatch(app.events.privateMessage({ text: source.command, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.deepEqual(order, source.panel ? ['send', 'check'] : ['send']);
    if (source.panel) assert.deepEqual(requests.at(-1)?.body.arguments, { panel: source.panel });
  });
}
