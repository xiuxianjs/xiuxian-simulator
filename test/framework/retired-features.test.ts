import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import router from '../../src/router';
import { inspectMessage } from 'alemonjs/testing';
import themes from '../../src/response/theme/myThemes/res';
import recharge from '../../src/response/recharge/info/res';
import eventOverview from '../../src/response/limitedEvent/overview/res';
import eventTokens from '../../src/response/limitedEvent/tokens/res';
import tianshu from '../../src/response/tianshu/res';
import { sendMiddlewareReply } from '../../src/response/middlewareReply';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

test('下架商城、活动充值和海外仙岛旧指令不调用业务接口', async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('retired feature reached the API'); });
  await app.mount({ responseRouter: router });
  for (const prefix of ['/', '#', '＃', '']) {
    for (const command of ['领取回归礼包', '领取回归礼包 OLD', '领取测试礼包', '领取测试礼包 OLD', '凡人修仙礼包码', '赞助', '赞助购买 30', '活动商城', '活动商店', '海岛', '限时活动 商店', '限时活动 任务', '限时活动 特惠', '活动购买 1 1', '活动充值', '活动充值购买 1 2', '活动充值领取 1 2', '海外仙岛', '海外仙岛 测试 货品', '海外仙岛 测试 记录', '海外仙岛 测试 转盘 10']) {
      for (const privateChat of [false, true]) {
        const event = privateChat
          ? app.events.privateMessage({ text: prefix + command, platform: 'qq-bot' })
          : app.events.groupMessage({ text: prefix + command, platform: 'qq-bot' });
        const result = await app.dispatch(event);
        assert.equal(requests.length, 0, prefix + command);
        assert.equal(result.messages.length, 0, prefix + command);
      }
    }
  }
});

const oldPrivacy = '⚠️ 为了保护您的账号安全，活动充值相关信息仅在私聊中展示，请私聊发送指令查看';
const retired = /赞助|活动(?:充值|商城|商店|购买)|海外仙岛|海岛|限时活动\s+(?:商店|任务|特惠)/;
const reply = { title: '充值', heading: '', text: oldPrivacy, buttons: [], advice: [] };

for (const raw of [false, true]) {
  test(`/充值的服务端私聊提示不带下架名称（rawLines=${raw}）`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ ...reply, ...(raw ? { title: '', text: '', rawLines: [oldPrivacy] } : {}) }]));
    const result = await app.runHandler(recharge, app.events.groupMessage({ text: '/充值', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.match(inspectMessage(message.nodes).text, /充值相关信息仅在私聊中展示/);
    assert.doesNotMatch(JSON.stringify(message.nodes), retired);
  });
}

test('/充值忽略服务端仍返回的活动套餐，并保留普通套餐与购买按钮', async t => {
  const catalog = {
    packages: [{ id: 1, name: '普通套餐', packageType: 'normal', priceAmount: 600, priceYuan: 6, grantSpiritStone: 1, grantSpiritCrystal: 0, grantSpiritMilk: 0,
      boughtCount: 0, grantItemsJson: '[]', grantEquipmentsJson: '[]', grantSkillsJson: '[]', description: '普通套餐说明', resolvedLimitPeriod: 'unlimited',
      doubleAvailable: false, limitText: '', doubleText: '', rewardParts: ['灵石 +1'] }],
    rewardNames: { items: {}, equipments: {}, skills: {} },
    sponsor: { totalYuan: 0, thresholdYuan: 648, remainingYuan: 648, hasThemePermission: false },
    benefitView: { sponsorIntro: '赞助说明，主题权限达到VIP6开启', monthCardPrivilegeLines: ['月卡权益'], seclusionPassPrivilegeLines: ['金手指权益'], seclusionPassFallbackLine: '金手指暂未开放' },
    activityPackages: [{ eventTitle: '活动充值', subActivityId: 1, subTitle: '下架套餐', packages: [{ tierLevel: 1, rechargeAmountFen: 600, rechargeAmountYuan: 6,
      roundedYuanText: '6', limitPerUser: 1, limitText: '', boughtCount: 0, rewardTextParts: ['下架奖励'] }] }]
  };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { catalog, showNewcomerRebate: true, showWeeklyRebate: true }));
  const result = await app.runHandler(recharge, app.events.privateMessage({ text: '/充值', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /普通套餐说明/);
  assert.ok(view.commands.includes('/充值购买 1'));
  assert.ok(view.commands.includes('/新人返利'));
  assert.doesNotMatch(JSON.stringify(message.nodes), /下架套餐|下架奖励|主题|theme/);
  assert.doesNotMatch(JSON.stringify(message.nodes), retired);
});

for (const staged of [false, true]) {
  test(`/天书隐藏服务端返回的海岛介绍并保留其他解锁（staged=${staged}）`, async t => {
    const unlocks = [{ realm: '金丹初期', features: ['出师', '海外仙岛', '本命物'] }, { realm: '金丹中期', features: ['海外仙岛'] }];
    const stage = { stageLevel: 5, stageName: '金丹', unlocks };
    const data = { intro: '天书', realmUnlocks: unlocks, notes: ['海外仙岛：还受活动开放时间影响。', '道友对战条件'], ...(staged ? { currentStage: stage, nextStage: stage } : {}) };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const result = await app.runHandler(tianshu, app.events.privateMessage({ text: '/天书', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const text = inspectMessage(message.nodes).text;
    assert.match(text, /出师/);
    assert.match(text, /本命物/);
    assert.doesNotMatch(text, /金丹中期/);
    assert.doesNotMatch(JSON.stringify(message.nodes), retired);
  });
}

test('通用服务端提示移除下架导航按钮和建议，保留其他导航', async t => {
  const { app } = await gameFixture(t, () => { throw new Error('no API expected'); });
  const result = await app.runHandler(async event => sendMiddlewareReply(event, {
    ...reply, text: '请选择功能', buttons: [{ label: '活动充值', command: '/活动充值' }, { label: '充值', command: '/充值' }, { label: '回归礼包', command: '/领取回归礼包' }, { label: '测试礼包', command: '/领取测试礼包' }, { label: '凡人修仙礼包码', command: '/凡人修仙礼包码' }, { label: '回归签到', command: '/回归签到' }],
    advice: [{ command: '/海外仙岛', description: '海岛' }, { command: '/限时活动 商店', description: '兑换' }, { command: '/我的活动', description: '活动' }]
  }), app.events.privateMessage({ text: '/充值', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.ok(view.commands.includes('/充值'));
  assert.ok(view.commands.includes('/我的活动'));
  assert.ok(view.commands.includes('/回归签到'));
  assert.doesNotMatch(JSON.stringify(message.nodes), /回归礼包|测试礼包|凡人修仙礼包码/);
  assert.doesNotMatch(JSON.stringify(message.nodes), retired);
});

test('限时活动总览隐藏下架阶段，活动余额不再提示充值获取', async t => {
  const event = { eventId: 1, eventTitle: '节日活动', description: '活动说明\n活动商城兑换', startTime: '2026-10-01T00:00:00+08:00', endTime: '2026-11-01T00:00:00+08:00',
    paidTokenName: '纪念币', freeTokenName: '任务币', paidToken: 3, freeToken: 4,
    subActivities: ['活动充值', '活动商店', '海外仙岛', '活动任务'].map((title, i) => ({ id: i + 1, title, startTime: '2026-10-01T00:00:00+08:00', endTime: '2026-11-01T00:00:00+08:00', isActive: true })) };
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, [event]));
  for (const [handler, command] of [[eventOverview, '/限时活动'], [eventTokens, '/活动道具']] as const) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const text = inspectMessage(message.nodes).text;
    assert.match(text, /纪念币/);
    assert.match(text, /任务币/);
    assert.doesNotMatch(text, /充值获得/);
    if (command === '/限时活动') assert.match(text, /活动任务/);
    assert.doesNotMatch(JSON.stringify(message.nodes), retired);
  }
});

test('主题页展示服务端给出的VIP等级条件与真实权限状态', async t => {
  for (const canCustomEdit of [false, true]) {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      themes: [], permission: { canCustomEdit, maxCustomSlots: 3, requiredVipLevel: 6 }
    }));
    const result = await app.runHandler(themes, app.events.privateMessage({ text: '/我的主题', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const text = inspectMessage(message.nodes).text;
    assert.match(text, /达到VIP6后开启自定义主题权限/);
    assert.ok(text.includes(canCustomEdit ? '自定义：0/3' : '自定义：未开放'));
    assert.doesNotMatch(text, /赞助|648元/);
  }
});
