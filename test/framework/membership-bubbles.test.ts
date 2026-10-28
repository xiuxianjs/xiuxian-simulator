import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import rightsHandler from '../../src/response/monthCard/rights/res';
import privilegesHandler from '../../src/response/monthCard/privileges/res';
import claimHandler from '../../src/response/monthCard/claim/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const rights = () => ({
  name: '测试道友', vipLevel: 2, totalRechargeAmount: 3000, nextVipLevel: 3, nextVipThreshold: 6000, firstRechargeTime: null,
  activeThemeConfig: null, canUseMeridian: true, canUseSoulPath: false, progressText: '距 VIP 3 还需 ¥30.00',
  monthCardInstantRewards: ['灵晶 ×500'], seclusionPriceText: '¥30', seclusionRewards: ['闭关加速'],
  monthCard: { active: true, expireTime: '2026-11-01T23:59:59+08:00', remainingDays: 10, totalDays: 30, maxDays: 90, remainingQuota: 60, package: null,
    daily: { total: 30, claimableCount: 0, claimedCount: 20, upcomingCount: 10,
      calendarState: Array.from({ length: 9 }, (_, index) => ({ day: index + 1, rewardDate: `2026-10-${String(index + 21).padStart(2, '0')}`, state: index === 0 ? 'claimed' : 'upcoming' })) }
  },
  seclusionPass: { active: false, expireTime: null, remainingDays: 0, totalDays: 0, maxDays: 90, package: null }
});
const claim = { beforeTotal: 30, claim: { days: 2, rewards: { spiritCrystal: 100, mentalPill: 4, qiPill: 6 } },
  status: { total: 30, claimableCount: 0, claimedCount: 22, upcomingCount: 8, records: [],
    dailyRewards: { spiritCrystal: 50, mentalPillItemId: 1, mentalPillQuantity: 2, qiPillItemId: 2, qiPillQuantity: 3 } } };

for (const privateChat of [false, true]) {
  test(`权益首页保留真实进度，未来奖励不写已领完，辅助查询失败不猜原因（${privateChat ? '私聊' : '群聊'}）`, async t => {
    const data = rights();
    const { app, requests } = await gameFixture(t, r => r.path.includes('/membership.rights') ? businessEnvelope(r.bid, data) : {});
    const event = privateChat ? app.events.privateMessage({ text: '/我的权益', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的权益', platform: 'qq-bot' });
    const result = await app.runHandler(rightsHandler, event);
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.match(view.text, /VIP 2.*累计充值 ¥30.00/);
    assert.match(view.text, /距 VIP 3 还需 ¥30.00/);
    assert.match(view.text, /月卡 · 生效中/);
    assert.match(view.text, /暂无可领/);
    assert.match(view.text, /金手指 · 未开通/);
    assert.match(view.text, /状态暂未获取/);
    assert.doesNotMatch(view.text, /当前已领完|尚未开通|按规则|筑基初期后访问/);
    assert.ok(!view.commands.includes('/一键领取月卡'));
    assert.ok(view.commands.includes('/我的权益 月卡'));
    assert.ok(view.commands.includes('/我的订单'));
    assert.equal(requests.length, 4);
    assert.equal(requests.filter(request => request.path.endsWith('/spirit-vein.overview')).length, 1);
    assert.ok(requests.slice(1).every(r => !r.path.includes('claim')));
  });
}

test('月卡可领按钮在对应引用块，详情日历沿用七天分页且不补查概要', async t => {
  const data = rights(); data.monthCard.daily.claimableCount = 2;
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, data));
  const detail = await app.runHandler(rightsHandler, app.events.privateMessage({ text: '/我的权益 月卡', platform: 'qq-bot' }));
  assert.equal(detail.messages.length, 1);
  assert.equal(detail.actions[detail.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const quotes = detail.messages[0].nodes.flatMap(n => n.type === 'Markdown' ? n.value.filter(c => c.type === 'MD.blockquote') : []);
  assert.ok(quotes.some(q => JSON.stringify(q).includes('/一键领取月卡') && JSON.stringify(q).includes('可领 2 天')));
  const calendar = await app.runHandler(rightsHandler, app.events.privateMessage({ text: '/我的权益 月卡日历 2', platform: 'qq-bot' }));
  assert.equal(calendar.messages.length, 1);
  assert.equal(calendar.actions[calendar.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(calendar.messages[0].nodes);
  assert.match(view.text, /第 8 天/); assert.match(view.text, /第 9 天/); assert.doesNotMatch(view.text, /第 7 天/);
  assert.ok(view.commands.includes('/我的权益 月卡日历 1'));
  assert.equal(requests.length, 2);
});

test('特权分类前置，保留加成和解锁条件，隐藏其他分类内容', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, {
    found: true, name: '道友', vipLevel: 2, totalRechargeAmount: 3000, hasMonthCard: true, pillDailyLimit: 8,
    levelEligibility: Array.from({ length: 10 }, (_, minLevel) => ({ minLevel, unlocked: minLevel <= 2, needAmount: minLevel > 2 ? 3000 : 0 })),
    checkinDoubleDays: Object.fromEntries(['vip2_double_days', 'vip4_double_days', 'vip6_double_days', 'vip8_double_days'].map(key => [key, [4, 5]])),
    activeThemeConfig: null, canUseMeridian: true, canUseSoulPath: false,
    vipPrivileges: [{ text: '每日可购 8 份', unlocked: true }, { text: '商店 97 折', unlocked: false, needText: '还需 ¥30' }],
    monthCardPrivileges: [{ text: '经验加成 +10%', unlocked: true }]
  }));
  for (const [command, present, absent] of [['/我的特权', '每日可购 8 份', '商店 97 折'], ['/我的特权 未解锁', '商店 97 折', '每日可购 8 份'], ['/我的特权 月卡', '经验加成 +10%', '商店 97 折']]) {
    const result = await app.runHandler(privilegesHandler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(present)); assert.ok(!view.text.includes(absent));
    assert.doesNotMatch(view.text, /无需再次领取|玩法仍需/);
    const nodes = result.messages[0].nodes.flatMap(n => n.type === 'Markdown' ? n.value : []);
    assert.ok(nodes.findIndex(n => n.type === 'MD.button' && n.options?.data === '/我的特权') < nodes.findIndex(n => n.type === 'MD.blockquote'));
    if (command.includes('未解锁')) assert.match(view.text, /还需 ¥30/);
  }
  assert.equal(requests.length, 3);
});

test('月卡领取回执保留全部到账数量和未来进度，一次请求且不提供再次领取', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, claim));
  const result = await app.runHandler(claimHandler, app.events.privateMessage({ text: '/一键领取月卡', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  for (const text of ['已领取 2 天奖励', '灵晶 ×100', '精力丹 ×4', '元力丹 ×6', '累计已发 22 天', '后续待发 8 天']) assert.ok(view.text.includes(text));
  assert.doesNotMatch(view.text, /奖励进度|领取成功|未到期/);
  assert.deepEqual(view.commands.filter(command => !['/我', '/属性面板', '/查看主线', '/我的活动', '/商店'].includes(command)), ['/我的权益', '/我的权益 月卡日历']);
  assert.equal(requests.length, 1); assert.ok(requests[0].idempotencyKey);
});

test('月卡未生效和无可领反馈精简闲聊，未知结果只引导查看', async t => {
  let mode = 0;
  const { app, requests } = await gameFixture(t, r => {
    if (mode === 2) throw new Error('connection lost');
    return businessEnvelope(r.bid, undefined, [{ title: '月卡领取', heading: '',
      text: mode === 0 ? '❤ 你尚未开通月卡或月卡已过期，无法领取每日奖励。\n\n道友，你是来找我玩的吗' : '今日暂无可领取的奖励。\n\n重复提示',
      quote: '每天有新的奖励到账，记得来领取哦～', buttons: [], advice: [] }]);
  });
  for (const expected of ['月卡未生效。', '今日暂无可领。', '领取结果待确认']) {
    const result = await app.runHandler(claimHandler, app.events.privateMessage({ text: '/一键领取月卡', platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(expected)); assert.doesNotMatch(view.text, /找我玩|重复提示|记得来|稍后再试/);
    assert.ok(view.commands.includes('/我的权益 月卡'));
    assert.ok(!view.commands.includes('/一键领取月卡'));
    mode++;
  }
  assert.equal(requests.length, 3);
});

test('特权每页五项，翻页保留分类且不重复显示其他页', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, {
    found: true, name: '道友', vipLevel: 2, totalRechargeAmount: 3000, hasMonthCard: true, pillDailyLimit: 8,
    levelEligibility: Array.from({ length: 10 }, (_, minLevel) => ({ minLevel, unlocked: minLevel <= 2, needAmount: minLevel > 2 ? 3000 : 0 })),
    checkinDoubleDays: Object.fromEntries(['vip2_double_days', 'vip4_double_days', 'vip6_double_days', 'vip8_double_days'].map(key => [key, [4, 5]])),
    activeThemeConfig: null, canUseMeridian: true, canUseSoulPath: false,
    vipPrivileges: Array.from({ length: 6 }, (_, n) => ({ text: `未解锁奖励${n + 1}`, unlocked: false, needText: '还需 ¥30' })),
    monthCardPrivileges: []
  }));
  const result = await app.runHandler(privilegesHandler, app.events.privateMessage({ text: '/我的特权 未解锁', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.ok(view.commands.includes('/我的特权 未解锁 2'));
  assert.match(view.text, /未解锁奖励5/); assert.doesNotMatch(view.text, /未解锁奖励6/);
  const next = await app.runHandler(privilegesHandler, app.events.privateMessage({ text: '/我的特权 未解锁 2', platform: 'qq-bot' }));
  assert.equal(next.messages.length, 1);
  assert.equal(next.actions[next.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const older = inspectMessage(next.messages[0].nodes);
  assert.match(older.text, /未解锁奖励6/); assert.doesNotMatch(older.text, /未解锁奖励5/);
  assert.ok(older.commands.includes('/我的特权 未解锁 1'));
  assert.equal(requests.length, 2);
});

test('权益首页订单在顶部，返利在底部，过期月卡可补领且保留全局导航', async t => {
  const data = rights();
  data.progressText = '升级进度：30/128元 → VIP3';
  data.monthCard.active = false;
  data.monthCard.expireTime = '2026-05-11T01:24:00+08:00';
  data.monthCard.daily.claimableCount = 21;
  const { app, requests } = await gameFixture(t, r => r.path.includes('/membership.rights') ? businessEnvelope(r.bid, data) : {});
  const result = await app.runHandler(rightsHandler, app.events.privateMessage({ text: '/我的权益', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.deepEqual(view.commands.filter(command => !['/我', '/属性面板', '/查看主线', '/我的活动', '/商店'].includes(command)), [
    '/我的订单', '/我的特权', '/我的权益 月卡', '/一键领取月卡', '/我的权益 金手指', '/我的权益 灵脉租契', '/充值 灵脉租契', '/充值', '/里程碑',
    '/充值', '/新人返利', '/周周返利'
  ]);
  const nodes = message.nodes.flatMap(n => n.type === 'Markdown' ? n.value : []);
  const quotes = nodes.filter(n => n.type === 'MD.blockquote');
  assert.equal(quotes.length, 6);
  assert.ok(nodes.findIndex(n => n.type === 'MD.button' && n.options?.data === '/我的订单') < nodes.findIndex(n => n.type === 'MD.blockquote'));
  const quoteView = (index: number) => {
    const quote = quotes[index];
    if (!Array.isArray(quote.value)) throw new Error('Expected quote');
    return inspectMessage([{ type: 'Markdown', value: quote.value }]);
  };
  assert.match(quoteView(0).text, /升级进度：30\/128元 → VIP3/);
  assert.match(quoteView(1).text, /月卡 · 已过期/);
  assert.match(quoteView(1).text, /已到期：2026-05-11 01:24/);
  assert.match(quoteView(1).text, /可领 21 天（可补领）/);
  assert.deepEqual(quoteView(1).commands, ['/我的权益 月卡', '/一键领取月卡']);
  assert.match(quoteView(2).text, /金手指 · 未开通/);
  assert.deepEqual(quoteView(3).commands, ['/我的权益 灵脉租契', '/充值 灵脉租契']);
  assert.deepEqual(quoteView(4).commands, ['/充值']);
  assert.equal(requests.length, 4);
  assert.equal(requests.filter(request => request.path.endsWith('/spirit-vein.overview')).length, 1);
});

test('VIP过滤主题权益后再分页，空双倍日配置仍可读取', async t => {
  const current = ['精力丹/元力丹每日各限购13份', '百宝商店·神奇商店93折', '百宝商店·万宝楼93折', '全修为加成+15%', '自定义主题3个槽位', '资源商店93折'];
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, {
    found: true, name: '道友', vipLevel: 7, totalRechargeAmount: 328000, hasMonthCard: false, pillDailyLimit: 13,
    levelEligibility: Array.from({ length: 10 }, (_, minLevel) => ({ minLevel, unlocked: minLevel <= 7, needAmount: minLevel > 7 ? 100 : 0 })),
    checkinDoubleDays: {}, activeThemeConfig: null, canUseMeridian: true, canUseSoulPath: true,
    vipPrivileges: [
      { minLevel: 3, text: '百宝商店·神奇商店97折', unlocked: true },
      ...current.map(text => ({ minLevel: 7, text, unlocked: true })),
      { minLevel: 8, text: '资源商店92折', unlocked: false, needText: '还需1元' }
    ], monthCardPrivileges: []
  }));
  for (const [command, expected] of [['/我的特权', current.filter(text => !text.includes('主题'))], ['/我的特权 2', current.filter(text => !text.includes('主题'))] ] as const) {
    const result = await app.runHandler(privilegesHandler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    for (const text of expected) assert.ok(view.text.includes(text));
    assert.doesNotMatch(view.text, /主题|97折|92折|签到币双倍|月卡期间生效/);
  }
});


test('权益中的月卡与金手指按配置展示价格和开通续期入口', async t => {
  const data = { ...rights(), monthCard: { ...rights().monthCard, package: { id: 2, priceAmount: 3000, grantSpiritStone: 0, grantSpiritCrystal: 20, grantSpiritMilk: 0, items: [], skills: [] } },
    seclusionPass: { ...rights().seclusionPass, package: { id: 3, priceAmount: 990, grantSpiritStone: 0, grantSpiritCrystal: 0, grantSpiritMilk: 0, items: [], skills: [] } } };
  const { app } = await gameFixture(t, r => r.path.endsWith('/membership.rights') ? businessEnvelope(r.bid, data) : {});
  const result = await app.runHandler(rightsHandler, app.events.privateMessage({ text: '/我的权益', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /月卡 · 生效中 · ¥30/);
  assert.match(view.text, /金手指 · 未开通 · ¥9.9/);
  assert.ok(view.commands.includes('/充值 月卡'));
  assert.ok(view.commands.includes('/充值 金手指'));
  assert.doesNotMatch(view.text, /充值奖励|新人返利：|周周返利：/);
  assert.ok(!view.commands.includes('/礼包奖励'));
});


test('历史预发奖励显示未解锁和已发说明，日历不提供重复领取', async t => {
  const data = rights();
  const repaired = { ...data, monthCard: { ...data.monthCard, daily: { ...data.monthCard.daily,
    total: 120, claimedCount: 120, claimableCount: 0, upcomingCount: 0, prepaidCount: 38,
    calendarState: [{ day: 82, rewardDate: '2026-10-23', state: 'claimed' },
      { day: 83, rewardDate: '2026-10-24', state: 'upcoming', prepaid: true }] } } };
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, repaired));
  const result = await app.runHandler(rightsHandler, app.events.privateMessage({ text: '/我的权益 月卡日历', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /累计已发 120 天.*后续待发 0 天/);
  assert.match(view.text, /未解锁的 38 天奖励已历史发放，不会重复领取/);
  assert.match(view.text, /2026-10-24.*未解锁 · 历史已发/);
  assert.ok(!view.commands.includes('/一键领取月卡'));
});

test('购买记录不一致时显示待核对且没有领取按钮', async t => {
  const data = rights();
  const pending = { ...data, monthCard: { ...data.monthCard, daily: { ...data.monthCard.daily, reviewRequired: true } } };
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, pending));
  const result = await app.runHandler(rightsHandler, app.events.privateMessage({ text: '/我的权益 月卡', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /月卡购买记录待核对，暂不可领取/);
  assert.ok(!view.commands.includes('/一键领取月卡'));
});
