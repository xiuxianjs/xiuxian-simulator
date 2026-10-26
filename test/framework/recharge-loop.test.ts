import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import rights from '../../src/response/monthCard/rights/res';
import privileges from '../../src/response/monthCard/privileges/res';
import catalog from '../../src/response/recharge/info/res';
import milestone from '../../src/response/recharge/milestone/res';
import orders from '../../src/response/recharge/orders/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const rightsData = (active = true, claimable = 2) => ({
  name: '测试玩家', vipLevel: 3, totalRechargeAmount: 12345, nextVipLevel: 4, nextVipThreshold: 20000, firstRechargeTime: null,
  activeThemeConfig: null, canUseMeridian: true, canUseSoulPath: false, progressText: '下一等级进度', monthCardInstantRewards: ['灵晶 ×20'], seclusionPriceText: '金手指商品说明', seclusionRewards: ['自动便利权益'],
  monthCard: { active, expireTime: active ? '2026-11-21T00:00:00+08:00' : null, remainingDays: active ? 30 : 0, totalDays: 30, maxDays: 90, remainingQuota: 60, package: null,
    daily: { total: 9, claimableCount: claimable, claimedCount: 1, upcomingCount: 6, calendarState: Array.from({ length: 9 }, (_, i) => ({ day: i + 1, rewardDate: '2026-10-21', state: i === 0 ? 'claimed' : i < 3 ? 'claimable' : 'upcoming' })) } },
  seclusionPass: { active: false, expireTime: null, remainingDays: 0, totalDays: 0, maxDays: 90, package: null }
});
const pkg = (id: number, packageType: string) => ({ id, packageType, name: `商品${id}`, priceAmount: 3000, priceYuan: 30, description: '商品说明', grantSpiritStone: 0, grantSpiritCrystal: 10, grantSpiritMilk: 0, grantItemsJson: '[]', grantEquipmentsJson: '[]', grantSkillsJson: '[]', resolvedLimitPeriod: 'unlimited', boughtCount: 0, doubleAvailable: false, limitText: '', doubleText: '', rewardParts: ['灵晶 ×10'] });
const catalogData = { showNewcomerRebate: true, showWeeklyRebate: true, catalog: { packages: [pkg(1, 'normal'), pkg(2, 'month_card'), pkg(3, 'seclusion_pass'), pkg(4, 'first_charge')], rewardNames: { items: {}, equipments: {}, skills: {} }, activityPackages: [], sponsor: { totalYuan: 0, thresholdYuan: 100, remainingYuan: 100, hasThemePermission: false }, benefitView: { sponsorIntro: '说明', monthCardPrivilegeLines: ['每日奖励规则'], seclusionPassPrivilegeLines: ['自动便利权益'], seclusionPassFallbackLine: '暂未开放' } } };
const viewData = { empty: false, worldCountText: '100', nextMilestoneCount: 200, nextMilestoneGapText: '100', unclaimedCount: 1, milestones: [{ milestoneCount: 50, statusText: '✅ 已领取', rewardText: '历史奖励' }, { milestoneCount: 100, statusText: '🎉 可领取', rewardText: '灵晶x9' }, { milestoneCount: 200, statusText: '🔒 未解锁', rewardText: '下一档奖励' }] };
for (const isPrivate of [false, true]) for (const active of [false, true]) {
  test(`rights overview uses text, local options and unknown secondary state private=${isPrivate} active=${active}`, async t => {
    const { app, requests } = await gameFixture(t, request => request.path.includes('/membership.rights') ? businessEnvelope(request.bid, rightsData(active)) : {});
    const result = await app.runHandler(rights, isPrivate ? app.events.privateMessage({ text: '/我的权益', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的权益', platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('累计充值 ¥123.45'));
    assert.ok(view.text.includes('状态暂未获取'));
    assert.equal(view.commands.includes('/一键领取月卡'), true);
    for (const command of ['/我的权益 月卡', '/我的权益 金手指', '/我的特权', '/充值', '/新人返利', '/周周返利', '/里程碑', '/我的订单']) assert.ok(view.commands.includes(command), command);
    assert.equal(requests.length, 3);
    assert.ok(!JSON.stringify(message.nodes).includes('MD.image'));
    const quotes = message.nodes.flatMap(n => n.type === 'Markdown' ? n.value.filter(c => c.type === 'MD.blockquote') : []);
    assert.ok(quotes.some(q => Array.isArray(q.value) && inspectMessage([{ type: 'Markdown', value: q.value }]).commands.includes('/我的权益 月卡')));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const command of ['/我的权益 月卡', '/我的权益 金手指', '/我的权益 月卡日历 2']) {
  test(`rights detail ${command} loads only rights and preserves return path`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, rightsData()));
    const result = await app.runHandler(rights, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.commands.includes('/我的权益'));
    if (command.endsWith('2')) { assert.ok(view.text.includes('第 8 天')); assert.ok(!view.text.includes('第 1 天')); assert.ok(view.commands.includes('/我的权益 月卡日历 1')); }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const section of ['', '道晶套餐', '月卡', '金手指', '优惠礼包']) {
  test(`catalog ${section || 'home'} only opens selected category`, async t => {
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, catalogData));
    const result = await app.runHandler(catalog, app.events.privateMessage({ text: `/充值 ${section}`.trim(), platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.commands.includes('/我的权益'));
    if (!section) {
      assert.deepEqual(view.commands.filter(c => c.startsWith('/充值购买 ')), ['/充值购买 2', '/充值购买 3', '/充值购买 4']);
      for (const category of ['道晶套餐', '月卡', '金手指']) assert.ok(view.commands.includes(`/充值 ${category}`));
    } else {
      const id = ['', '道晶套餐', '月卡', '金手指', '优惠礼包'].indexOf(section);
      assert.ok(view.text.includes(`商品${id}`));
      assert.ok(view.text.includes('灵晶 ×10'));
      assert.deepEqual(view.commands.filter(c => c.startsWith('/充值购买 ')), [`/充值购买 ${id}`]);
    }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const unclaimedCount of [0, 1]) test(`milestone claim CTA matches count ${unclaimedCount}`, async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { ...viewData, unclaimedCount }));
  const result = await app.runHandler(milestone, app.events.groupMessage({ text: '/里程碑', platform: 'qq-bot' }));
  const view = inspectMessage(result.messages[0].nodes);
  assert.equal(view.commands.includes('/里程碑 领取'), unclaimedCount > 0);
  assert.ok(view.commands.includes('/我的权益'));
  assert.ok(!view.text.includes('历史奖励'));
});
test('milestone success renders issued values, no inferred grants', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { partial: false, claimed: [{ milestoneOrder: 1, issued: [{ type: 'currency', name: '灵晶', amount: 17 }, { type: 'item', name: '种子', amount: 2 }] }] }));
  const result = await app.runHandler(milestone, app.events.privateMessage({ text: '/里程碑 领取', platform: 'qq-bot' }));
  const view = inspectMessage(result.messages[0].nodes);
  assert.ok(view.text.includes('灵晶 ×17')); assert.ok(view.text.includes('种子 ×2'));
  assert.ok(view.commands.includes('/我的权益')); assert.ok(view.commands.includes('/里程碑'));
  assert.equal(requests.length, 1);
});
for (const status of ['PENDING', 'PAID', 'SUCCESS', 'TIMEOUT']) test(`manual query retains original order ${status}`, async t => {
  const { app, requests } = await gameFixture(t, request => request.path.endsWith('/membership.rights') ? businessEnvelope(request.bid, rightsData()) : request.path.endsWith('/settlement') ? { orderNo: 'N1', packageRewards: { spiritMilk: 8, spiritStone: 0, spiritCrystal: 0, items: [], equipments: [], skills: [] }, bonusSpiritMilk: 8, monthCardExtended: true, seclusionPassActivated: false } : { orderNo: 'N1', payAmount: 3000, status });
  const result = await app.runHandler(orders, app.events.privateMessage({ text: '/查询充值订单 N1', platform: 'qq-bot' }));
  const view = inspectMessage(result.messages[0].nodes);
  assert.ok(view.text.includes('N1'));
  assert.ok(view.commands.includes('/查询充值订单 N1'));
  assert.equal(view.commands.includes('/继续支付 N1'), status === 'PENDING');
  if (status === 'PAID') { assert.ok(view.text.includes('待发放')); assert.ok(!view.text.includes('已取消')); }
  if (status === 'SUCCESS') assert.ok(view.text.includes('道晶 +16'));
  assert.ok(!requests.some(r => /payment-create|payment-timeout/.test(r.path)));
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
test('orders are private and group requests expose no order reads', async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('should not request'); });
  const result = await app.runHandler(orders, app.events.groupMessage({ text: '/我的订单', platform: 'qq-bot' }));
  assert.equal(requests.length, 0);
  assert.ok(inspectMessage(result.messages[0].nodes).text.includes('仅支持私聊'));
});
test('order list uses player scoped pagination and continues existing orders', async t => {
  const { app, requests } = await gameFixture(t, request => request.path.endsWith('/membership.rights') ? businessEnvelope(request.bid, rightsData()) : { items: [{ orderNo: 'N1', status: 'PENDING', payAmount: 3000, packageId: 1 }], total: 6 });
  const result = await app.runHandler(orders, app.events.privateMessage({ text: '/我的订单', platform: 'qq-bot' }));
  const view = inspectMessage(result.messages[0].nodes);
  assert.ok(requests[1].path.includes('/players/1/payments/orders?'));
  assert.ok(requests[1].path.includes('pageSize=5'));
  for (const command of ['/我的订单 2', '/查询充值订单 N1', '/继续支付 N1', '/我的权益']) assert.ok(view.commands.includes(command));
});
test('privileges show active and locked rows separately without image rendering', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { found: true, name: '测试玩家', vipLevel: 1, totalRechargeAmount: 10, hasMonthCard: false, pillDailyLimit: 7, levelEligibility: Array.from({ length: 10 }, (_, i) => ({ minLevel: i, unlocked: i <= 1, needAmount: 0 })), checkinDoubleDays: { vip2_double_days: [], vip4_double_days: [], vip6_double_days: [], vip8_double_days: [] }, canUseMeridian: false, canUseSoulPath: false, activeThemeConfig: null, vipPrivileges: [{ text: '当前能力', unlocked: true }, { text: '待解锁能力', unlocked: false, needText: '还需充值' }], monthCardPrivileges: [] }));
  for (const locked of [false, true]) {
    const result = await app.runHandler(privileges, app.events.privateMessage({ text: locked ? '/我的特权 未解锁' : '/我的特权', platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(view.text.includes('待解锁能力'), locked);
    assert.equal(view.text.includes('当前能力'), !locked);
    assert.ok(view.commands.includes('/我的权益'));
  }
});

test('overview summaries use successful backend eligibility and counts', async t => {
  const reward = { spiritStone: 0, spiritCrystal: 1, spiritMilk: 0, items: [], rewardText: '灵晶 ×1', canClaim: true };
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/membership.rights')) return businessEnvelope(request.bid, rightsData(true, 0));
    if (request.path.endsWith('/recharge/first')) return { names: { items: {}, equipments: {}, skills: {} }, tiers: [{ tierAmountYuan: 30, status: 'claimable', rewards: [], rewardText: '灵晶 ×1' }] };
    if (request.path.endsWith('/recharge/newcomer')) return { contentDays: 14, isInPeriod: true, daysSinceRegistration: 0, currentDay: 1, todayRechargedAmount: 3000, thresholdAmount: 3000, claimedDays: [], todayRewardClaimed: false, maxClaimableDay: 1, itemNames: {}, rewards: [{ ...reward, day: 1, claimed: false, statusTag: '可领取' }] };
    if (request.path.endsWith('/recharge/weekly-rebate')) return { eligible: true, minAccountDays: 14, dailyThresholdAmount: 3000, daysSinceRegistration: 15, todayDayOfWeek: 1, todayLabel: '周一', weekStart: '2026-10-19', todayRechargedAmount: 3000, todayRechargedYuan: 30, todayRechargeText: '30.00', thresholdYuan: 30, claimedDays: [], canClaimToday: false, canClaimBonus: false, rewards: [] };
    if (request.path.endsWith('/recharge/world-milestones')) return viewData;
    throw new Error('Unexpected path: ' + request.path);
  });
  const result = await app.runHandler(rights, app.events.privateMessage({ text: '/我的权益', platform: 'qq-bot' }));
  const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 3);
  assert.ok(view.text.includes('首充'));
  assert.ok(view.text.includes('1 档可领'));
  assert.ok(!view.text.includes('新人返利：'));
  assert.ok(!view.text.includes('周周返利：'));
  assert.ok(!view.text.includes('充值奖励'));
  assert.ok(!requests.some(r => /newcomer|weekly-rebate/.test(r.path)));
  assert.ok(view.text.includes('全服 100 人'));
  assert.ok(view.commands.includes('/里程碑 领取'));
  assert.ok(!view.commands.includes('/一键领取月卡'));
  assert.ok(!view.text.includes('状态暂未获取'));
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});

for (const mode of ['http', 'structured']) test(`recharge refusal preserves server reason and returns to hub ${mode}`, async t => {
  const { app } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: '原业务拒绝原因' } : businessEnvelope(request.bid, undefined, [{ title: '原标题', heading: '原说明', text: '原业务拒绝原因', quote: '原引用', buttons: [{ label: '原操作', command: '/充值' }], advice: [{ command: '/我的信息', description: '原服务建议' }] }]), mode === 'http' ? 409 : 200);
  const result = await app.runHandler(rights, app.events.privateMessage({ text: '/我的权益', platform: 'qq-bot' }));
  const view = inspectMessage(result.messages[0].nodes);
  assert.ok(view.text.includes('原业务拒绝原因'));
  assert.ok(view.commands.includes('/我的权益'));
  if (mode === 'structured') {
    assert.ok(view.text.includes('原引用')); assert.ok(view.text.includes('原服务建议'));
    assert.ok(view.commands.includes('/充值')); assert.ok(view.commands.includes('/我的信息'));
  }
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
