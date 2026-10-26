import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { Format, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { startFeatureVisibility } from '../../src/utils/featureVisibility';
import { useMessage } from '../../src/utils/useMessage';
import { FormatGui, createQuoteMarkdown } from '../../src/utils/messageHelper';
import { requestRobotBusiness } from '../../src/api/bot/robot-business';
import { presentationAccessFor } from '../../src/api/bot/presentation-access-state';
import { showOnboarding, onboardingContent } from '../../src/response/onboarding/context';
import type { TianshuContent } from '../../src/api/bot/tianshu-content';
import tianshu from '../../src/response/tianshu/res';
import activity from '../../src/response/activity/res';
import { deliverNotification } from '../../src/notification/delivery';
import type { GameEvent } from '../../src/types/event';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const definitions = [
  ['help', '天书', 0], ['profile', '个人资料', 0], ['maintenance', '已有记录清理', 0],
  ['account', '账号安全', 0], ['storyline', '主线', 1], ['friends', '好友', 2], ['alchemy', '炼丹师', 9], ['tower-shop', '积分商店', 13]
] as const;
const commands = { '天书': 'help', '我的境界': 'profile', '我': 'profile', '飞信解除': 'maintenance', '继续引导': 'account', '退出引导': 'account', '主线挑战': 'storyline', '我的好友': 'friends', '加入炼丹师': 'alchemy', '商店': 'help', '商店 积分': 'tower-shop' };
const catalog = (level: number) => ({
  gateVersion: 1, commandFeatures: commands, intro: '真实门槛目录', realmUnlocks: [], notes: [],
  featureCatalog: [{ stageLevel: 0, stageName: '功能目录', features: definitions.map(([id, name, minimum]) => ({ id, name, description: `${name}说明`, realm: minimum ? `境界${minimum}` : '无境界限制', realmReached: level >= minimum, visible: level >= minimum, conditions: [] })) }]
});
const activate = (app: Awaited<ReturnType<typeof gameFixture>>['app']) => app.invoke(app.events.groupMessage(), startFeatureVisibility);
const assertDelivered = (result: Awaited<ReturnType<Awaited<ReturnType<typeof gameFixture>>['app']['invoke']>>) => {
  assert.ok(result.messages.length > 0);
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
};

for (const privateChat of [false, true]) {
  test(`统一发送器过滤内联、引用、键盘、文字入口并保持原始消息 private=${privateChat}`, async t => {
    const { app, requests } = await gameFixture(t, request => catalog(request.bid === 'advanced' ? 9 : 0));
    await activate(app);
    const makeEvent = (userId: string) => privateChat ? app.events.privateMessage({ userId, platform: 'qq-bot' }) : app.events.groupMessage({ userId, platform: 'qq-bot' });
    const quote = createQuoteMarkdown(['本人资产仍可查看'], [{ label: '好友', command: '/我的好友' }, { label: '解除', command: '/飞信解除 2' }]);
    const md = Format.createMarkdown().addBlockquote(quote).addText('入口：/加入炼丹师').addNewline().addText('帮助链接：https://example.com/help');
    const bubble = FormatGui({ content: md, footer: [{ label: '好友', command: '/我的好友' }], keyboard: [[{ label: '加入', command: '/加入炼丹师' }, { label: '商店积分', command: '/商店 积分' }]], bar: false });
    const original = JSON.stringify(bubble.format.value);
    const low = await app.invoke(makeEvent('new'), async () => {
      await useMessage()[0].send(bubble);
      await useMessage()[0].send(bubble.format.value);
    });
    assertDelivered(low);
    for (const message of low.messages) {
      const view = inspectMessage(message.nodes);
      assert.deepEqual(view.commands, ['/飞信解除 2']);
      assert.match(view.text, /本人资产仍可查看/);
      assert.match(view.text, /https:\/\/example.com\/help/);
      assert.doesNotMatch(view.text, /加入炼丹师/);
    }
    assert.equal(requests.filter(request => request.bid === 'new').length, 1, 'same event shares one access read');
    const high = await app.invoke(makeEvent('advanced'), () => useMessage()[0].send(bubble));
    assertDelivered(high);
    const highCommands = inspectMessage(high.messages[0].nodes).commands;
    assert.ok(highCommands.includes('/我的好友'));
    assert.ok(highCommands.includes('/加入炼丹师'));
    assert.ok(!highCommands.includes('/商店 积分'), 'longest alias wins over zero-gate shop');
    assert.equal(JSON.stringify(bubble.format.value), original, 'no mutation of quote/template across users');
    assert.equal(requests.filter(request => request.bid === '').length, 1, 'rules loaded once without fabricated identity');
  });
}

test('突破写请求后，同一事件的下一条气泡立即刷新开放状态', async t => {
  let level = 1;
  let activeEvent: object & { UserId?: string };
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.includes('/business/')) {
      // An interim send observed the pre-commit realm while the write was pending.
      void presentationAccessFor(activeEvent, () => Promise.resolve({ profile: true, friends: false }));
      level = 2;
      return businessEnvelope(request.bid, {});
    }
    return catalog(request.bid ? level : 0);
  });
  await activate(app);
  const event = app.events.privateMessage({ userId: 'new', platform: 'qq-bot', text: '/突破' });
  activeEvent = event;
  const result = await app.invoke(event, async () => {
    const bubble = FormatGui({ footer: [{ label: '好友', command: '/我的好友' }], content: Format.createMarkdown().addText('成长状态'), bar: false });
    await useMessage()[0].send(bubble);
    await requestRobotBusiness(event as GameEvent, 'realm.breakthrough', {}, () => ({}));
    await useMessage()[0].send(bubble);
  });
  assertDelivered(result);
  assert.ok(!inspectMessage(result.messages[0].nodes).commands.includes('/我的好友'));
  assert.ok(inspectMessage(result.messages[1].nodes).commands.includes('/我的好友'));
  assert.equal(requests.filter(request => request.path.startsWith('/api/v1/content/tianshu') && request.bid).length, 2);
});

test('教学回调保留版本、收件人及主线动作，未开放动作不进入气泡', async t => {
  const { app } = await gameFixture(t, request => catalog(request.bid ? 1 : 0));
  await app.mount({ responseContent: onboardingContent });
  await activate(app);
  const event = app.events.privateMessage({ userId: 'new', platform: 'qq-bot', text: '/继续引导' });
  const result = await app.invoke(event, () => showOnboarding(event as GameEvent, {
    status: 'active', phase: 'explore', version: 7, title: '宋玉 · 主线', lines: ['先挑战首章'], feedback: [],
    actions: [{ label: '挑战', command: '/主线挑战 1-1' }, { label: '未开放', command: '/加入炼丹师' }]
  }));
  assertDelivered(result);
  const raw = JSON.stringify(result.messages[0].nodes);
  assert.match(raw, /主线挑战 1-1/);
  assert.doesNotMatch(raw, /加入炼丹师/);
  assert.match(raw, /ob7.0/);
  assert.match(raw, /"userIds":\["new"\]/);
});

test('天书当前与下境预告不受普通菜单过滤影响', async t => {
  const full: TianshuContent = catalog(1);
  full.featureCatalog = [
    { stageLevel: 0, stageName: '通用', features: full.featureCatalog![0].features.filter((_, index) => index !== 4 && index !== 6) },
    { stageLevel: 1, stageName: '炼气', features: [full.featureCatalog![0].features[4]] },
    { stageLevel: 2, stageName: '筑基', features: [full.featureCatalog![0].features[6]] }
  ];
  full.currentStage = { stageLevel: 1, stageName: '炼气', realmName: '炼气一层', unlocks: [] };
  full.nextStage = { stageLevel: 2, stageName: '筑基', unlocks: [] };
  const { app } = await gameFixture(t, request => request.path.includes('/business/') ? businessEnvelope(request.bid, full) : full);
  await activate(app);
  for (const text of ['/天书', '/天书 2']) {
    const result = await app.runHandler(tianshu, app.events.privateMessage({ userId: 'new', text, platform: 'qq-bot' }));
    assertDelivered(result);
    const view = inspectMessage(result.messages[0].nodes);
    assert.match(view.text, /炼丹师 · 待开放/);
    if (text === '/天书') {
      assert.match(view.text, /当前大境界：炼气/);
      assert.match(view.text, /下一大境界：筑基/);
      assert.ok(view.commands.includes('/天书 1'));
    } else {
      assert.match(view.text, /第2\/2页/);
      assert.ok(view.commands.includes('/天书 1'));
      assert.ok(view.commands.includes('/天书'));
    }
  }
});

test('规则不可用时不泄露任何未确认入口，仍保留错误正文', async t => {
  const { app } = await gameFixture(t, () => ({ code: 'UNAVAILABLE', message: '离线' }), 503);
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot' }), async () => {
    await assert.rejects(startFeatureVisibility);
    await useMessage()[0].send(FormatGui({ content: Format.createMarkdown().addText('请稍后重试'), footer: [{ label: '炼丹', command: '/加入炼丹师' }], bar: false }));
  });
  assertDelivered(result);
  assert.match(inspectMessage(result.messages[0].nodes).text, /请稍后重试/);
  assert.deepEqual(inspectMessage(result.messages[0].nodes).commands, []);
});

test('原生 content 键盘与文字入口也遵守同一规则，链接保留', async t => {
  const { app } = await gameFixture(t, () => catalog(0));
  await activate(app);
  const result = await app.invoke(app.events.privateMessage({ userId: 'new', platform: 'qq-bot' }), () => useMessage()[0].send({
    content: {
      text: '入口：/加入炼丹师\n当前角色状态',
      keyboard: { rows: [[
        { id: 'alchemy', label: '炼丹', action: { type: 'command', data: '/加入炼丹师' } },
        { id: 'tianshu', label: '天书', action: { type: 'command', data: '/天书' } },
        { id: 'site', label: '网站', action: { type: 'link', data: 'https://example.com' } }
      ]] }
    }
  }));
  assertDelivered(result);
  const raw = JSON.stringify(result.actions);
  assert.doesNotMatch(raw, /加入炼丹师/);
  assert.match(raw, /天书/);
  assert.match(raw, /https:\/\/example.com/);
  assert.match(raw, /当前角色状态/);
});

test('个人状态读取失败仅保留启动确认的零门槛入口', async t => {
  const { app } = await gameFixture(t, request => request.bid ? { invalid: true } : catalog(0));
  await activate(app);
  const result = await app.invoke(app.events.privateMessage({ userId: 'new', platform: 'qq-bot' }), () => useMessage()[0].send(FormatGui({
    content: Format.createMarkdown().addText('当前状态'), footer: [{ label: '天书', command: '/天书' }, { label: '好友', command: '/我的好友' }], bar: false
  })));
  assertDelivered(result);
  assert.deepEqual(inspectMessage(result.messages[0].nodes).commands, ['/天书']);
});

test('活动大厅隐藏未开放玩法的整行介绍，保留已开放的成就', async t => {
  const full: TianshuContent = catalog(0);
  full.commandFeatures = { ...full.commandFeatures, '成就': 'profile', '我的活动': 'help', '个人活动': 'help', '宗门活动': 'help', '通天塔': 'alchemy', '妖塔': 'alchemy' };
  const { app } = await gameFixture(t, request => request.path.includes('/business/') ? businessEnvelope(request.bid, {
    limitedEvent: { activeCount: 0 }, guildCompetition: { phase: 'INACTIVE' },
    guildSecretRealmWar: { phase: 'INACTIVE', activeStartAt: '', activeEndAt: '', maxAttackPerWeek: 0, remainingAttackCount: 0 },
    access: { hasGuild: false, canAccessOverseasIsland: false }, newcomerVisible: false, giftCodesVisible: false
  }) : full);
  await activate(app);
  const result = await app.runHandler(activity, app.events.privateMessage({ userId: 'new', text: '/我的活动', platform: 'qq-bot' }));
  assertDelivered(result);
  const view = inspectMessage(result.messages[0].nodes);
  assert.ok(view.commands.includes('/成就'));
  assert.doesNotMatch(view.text, /通天塔|镇妖塔|登塔闯关|逐层镇妖/);
});

test('主动通知按收件人隐藏未开放按钮，保留归属与数据正文', async t => {
  const { app } = await gameFixture(t, request => catalog(request.bid === 'owner' ? 0 : 9));
  await activate(app);
  const content = Format.createMarkdown().addBlockquote(createQuoteMarkdown(['本人已有记录'], [
    { label: '好友', command: '/我的好友' }, { label: '清理', command: '/飞信解除 2' }
  ]));
  const result = await app.invoke(app.events.privateMessage({ userId: 'sender', platform: 'qq-bot' }), async () => {
    const delivery = await deliverNotification({ recipientBid: 'owner', privateTarget: { platform: 'qq-bot', scope: 'c2c', targetId: 'owner' }, enabled: true, data: Format.create().addMarkdown(content).value }, {
      read: async () => null,
      send: async (_target, data) => { await useMessage()[0].send(data); },
      refreshAfterFailure: async () => null,
      recordFailure: async () => {}
    });
    assert.equal(delivery.route, 'private');
  });
  assertDelivered(result);
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /本人已有记录/);
  assert.deepEqual(view.commands, ['/飞信解除 2']);
});
