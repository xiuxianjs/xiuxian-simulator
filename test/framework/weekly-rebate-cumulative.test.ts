import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { Expose, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import info from '../../src/response/recharge/weeklyRebateInfo/res';
import claim from '../../src/response/recharge/weeklyRebateClaim/res';
import { parseBackendWeeklyRebate } from '../../src/api/bot/weekly-rebate-queries';
import { claimBackendWeeklyRebate, claimBackendWeeklyRebateLoop, parseRobotWeeklyRebateClaim } from '../../src/api/bot/weekly-rebate-claim';
import { createBackendRequestContext } from '../../src/api/bot/context';
import { WEEKLY_CUMULATIVE_MODE, WEEKLY_CUMULATIVE_RULES, WEEKLY_CUMULATIVE_THRESHOLDS, type CumulativeWeeklyRebateQueryData } from '../../src/api/schemas/weekly-rebate-query';
import { businessEnvelope, gameFixture } from './fixture';
import { membershipActions } from '../../src/expose/membership-actions';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const week = '2026-10-26';
const issued = [{ type: 'item', name: '精力丹', amount: 20 }, { type: 'item', name: '元力丹', amount: 20 }];
const money = (cents: number) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
const rewardTexts = ['精力丹x20、元力丹x20', '真灵丹x50、灵晶x10000', '培元丹x50、灵晶x10000', '培元丹x50、灵晶x10000', '培元丹x100、灵晶x20000', '藏宝图x20、灵晶x20000', '藏宝图x30、灵晶x20000'];

function cumulativeData(cents = 64800, loopClaimed = 0): CumulativeWeeklyRebateQueryData {
  const total = Math.floor(Math.max(0, cents - 64800) / 1000);

  return {
    mode: WEEKLY_CUMULATIVE_MODE, rulesVersion: WEEKLY_CUMULATIVE_RULES,
    eligible: true, minAccountDays: 15, daysSinceRegistration: 15, weekStart: week,
    periodStart: '2026-10-26T00:00:00+08:00', periodEnd: '2026-11-02T00:00:00+08:00', deadlineText: '2026-11-01 23:59:59（北京时间）',
    weekRechargedAmount: cents, weekRechargedYuan: cents / 100, weekRechargeText: money(cents), claimedAmounts: [],
    rewards: WEEKLY_CUMULATIVE_THRESHOLDS.map((yuan, index) => ({
      thresholdAmount: yuan * 100, thresholdYuan: yuan, label: `累充${yuan}元档`, configured: true, claimed: false, canClaim: cents >= yuan * 100,
      remainingAmount: Math.max(0, yuan * 100 - cents), remainingText: money(Math.max(0, yuan * 100 - cents)), statusTag: cents >= yuan * 100 ? '可领取' : '未达标',
      spiritStone: 0, spiritCrystal: index === 0 ? 0 : index < 4 ? 10000 : 20000, spiritMilk: 0,
      items: index === 0 ? [{ itemId: 38, name: '精力丹', quantity: 20 }, { itemId: 39, name: '元力丹', quantity: 20 }] : [], rewardText: rewardTexts[index]
    })),
    loop: { baseAmount: 64800, stepAmount: 1000, itemId: 1, name: '藏宝图', quantity: 1, totalCount: total, claimedCount: loopClaimed, claimableCount: Math.max(0, total - loopClaimed), expectedLoopCount: total, configured: true, canClaim: total > loopClaimed, statusTag: total > loopClaimed ? '可领取' : '暂无可领取次数', rewardText: '每超10元获得藏宝图x1' }
  };
}

type MessageNodes = NonNullable<Parameters<typeof inspectMessage>[0]>;
function quoteCards(nodes: MessageNodes) {
  return nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []).map(quote => {
    assert.equal(quote.type, 'MD.blockquote');
    if (quote.type !== 'MD.blockquote' || !Array.isArray(quote.value)) throw new Error('Expected quote card');

    return { raw: quote.value, view: inspectMessage([{ type: 'Markdown', value: quote.value }]) };
  });
}

function assertManualLinks(nodes: MessageNodes) {
  function visit(node: unknown) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object') return;
    const value = node as { type?: string; options?: { autoEnter?: boolean; data?: string }; value?: unknown };
    if (value.type === 'MD.button') {
      assert.equal(value.options?.autoEnter, false, value.options?.data);
      assert.ok([...(value.options?.data ?? '')].length <= 80);
    }
    if (Array.isArray(value.value)) visit(value.value);
  }
  visit(nodes);
}

for (const privateChat of [false, true]) test(`周累充七档使用真实消息引用、冻结原周次并手动发送（${privateChat ? '私聊' : '群聊'}）`, async t => {
  const data = cumulativeData();
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const event = privateChat ? app.events.privateMessage({ text: '/周周返利', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/周周返利', platform: 'qq-bot' });
  const result = await app.runHandler(info, event);
  assert.deepEqual(result.errors, []); assert.equal(result.messages.length, 1); assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/recharge.weekly-info');
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.indexOf('2026-11-01 23:59:59（北京时间）') < view.text.indexOf('本周累充：648.00元'));
  assert.doesNotMatch(view.text, /rulesVersion|weekly_cumulative|weekly-rebate-v2|今日充值|满勤大奖/);
  const cards = quoteCards(message.nodes); assert.equal(cards.length, 8);
  for (const [index, yuan] of WEEKLY_CUMULATIVE_THRESHOLDS.entries()) {
    const card = cards[index];
    assert.ok(card.raw.some(node => node.type === 'MD.bold' && node.value === `累充${yuan}元档`));
    assert.match(card.view.text, /状态：可领取/); assert.ok(card.view.text.includes(rewardTexts[index]));
    assert.deepEqual(card.view.commands, [`/周周返利领取 ${yuan} ${week}`]);
  }
  for (const category of ['日礼包', '周礼包', '月礼包']) assert.ok(view.commands.includes(`/充值 ${category}`));
  assertManualLinks(message.nodes);
});

test('周累充29.50元保持分币精度与0.50元差额，不提前开放领取', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, cumulativeData(2950)));
  const result = await app.runHandler(info, app.events.privateMessage({ text: '/周周返利', platform: 'qq-bot' }));
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /本周累充：29\.50元/); assert.match(quoteCards(result.messages[0].nodes)[0].view.text, /还差：0\.50元/);
  assert.equal(view.commands.some(command => command.startsWith('/周周返利领取 ')), false);
});

test('未满15天与未配置档位不提供领取蓝链，已领状态独立保留', async t => {
  const data = cumulativeData(); data.eligible = false; data.daysSinceRegistration = 14;
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const blocked = await app.runHandler(info, app.events.privateMessage({ text: '/周周返利', platform: 'qq-bot' }));
  const blockedView = inspectMessage(blocked.messages[0].nodes);
  assert.match(blockedView.text, /账号需满15天.*当前14天/); assert.equal(blockedView.commands.some(command => command.startsWith('/周周返利领取 ')), false);
  data.eligible = true; data.daysSinceRegistration = 15; data.claimedAmounts = [3000]; data.rewards[0].claimed = true; data.rewards[0].canClaim = false;
  data.rewards[1].configured = false;
  const fresh = await app.runHandler(info, app.events.privateMessage({ text: '/周周返利', platform: 'qq-bot' }));
  const cards = quoteCards(fresh.messages[0].nodes);
  assert.match(cards[0].view.text, /状态：已领取/); assert.deepEqual(cards[0].view.commands, []);
  assert.match(cards[1].view.text, /奖励待配置/); assert.deepEqual(cards[1].view.commands, []);
});

for (const [cents, claimed, total] of [[64800, 0, 0], [65799, 0, 0], [65800, 0, 1], [66800, 1, 2]] as const) test(`循环返利${money(cents)}元总额${total}次，已领${claimed}次按原总次数冻结`, async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, cumulativeData(cents, claimed)));
  const result = await app.runHandler(info, app.events.privateMessage({ text: '/周周返利', platform: 'qq-bot' }));
  const loop = quoteCards(result.messages[0].nodes).at(-1);
  assert.ok(loop); assert.match(loop.view.text, new RegExp(`累计可得：${total}次；已领：${claimed}次；当前可领：${total - claimed}次`));
  assert.deepEqual(loop.view.commands, total > claimed ? [`/周周返利领取 循环 ${week} ${total}`] : []);
  const text = inspectMessage(result.messages[0].nodes).text;
  assert.match(text, /不足10元部分不跨周结转/); assert.match(text, /未领取的达标奖励将通过个人邮件发放（含循环返利）/);
  assertManualLinks(result.messages[0].nodes);
});

for (const loop of [false, true]) test(`新${loop ? '循环' : '固定档'}领取只展示实发回执并保留原指令`, async t => {
  const command = loop ? `/周周返利领取 循环 ${week} 2` : `/周周返利领取 30 ${week}`;
  const data = { mode: WEEKLY_CUMULATIVE_MODE, rulesVersion: WEEKLY_CUMULATIVE_RULES, weekStart: week, kind: loop ? 'loop' : 'tier', thresholdAmount: loop ? 66800 : 3000, thresholdYuan: loop ? 668 : 30, label: loop ? '循环返利' : '累充30元档', issued: loop ? [{ type: 'item', name: '藏宝图', amount: 1 }] : issued, ...(loop ? { fromCount: 1, toCount: 2, claimedCount: 1 } : {}) };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(claim, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []); assert.equal(result.messages.length, 1); assert.equal(requests.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.deepEqual(requests[0].body.arguments, { input: command });
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, loop ? /循环返利 · 已领取/ : /累充30元档 · 已领取/);
  assert.match(view.text, loop ? /本次领取：1次[\s\S]*藏宝图x1/ : /精力丹x20、元力丹x20/);
  assertManualLinks(result.messages[0].nodes);
});

test('过期原周指令保留服务端拒绝原因，不回退领取新周', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '周周返利', heading: '', text: '本周已结束，原周奖励不可补领，请重新查询。', buttons: [], advice: [] }]));
  const command = `/周周返利领取 30 ${week}`;
  const result = await app.runHandler(claim, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
  assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { input: command });
  assert.equal(result.messages.length, 1); assert.match(inspectMessage(result.messages[0].nodes).text, /原周奖励不可补领/);
  assertManualLinks(result.messages[0].nodes);
});

test('已邮件结算的历史回执明确展示邮件发放，不声称再次背包到账', async t => {
  const data = { mode: WEEKLY_CUMULATIVE_MODE, rulesVersion: WEEKLY_CUMULATIVE_RULES, kind: 'tier', delivery: 'mail', weekStart: week, thresholdAmount: 3000, thresholdYuan: 30, label: '累充30元档', issued };
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(claim, app.events.privateMessage({ text: `/周周返利领取 30 ${week}`, platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []); assert.equal(result.messages.length, 1);
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /累充30元档 · 已发个人邮件/); assert.match(view.text, /邮件奖励：精力丹x20、元力丹x20/);
  assert.doesNotMatch(view.text, /获得：|背包到账/);
});

test('退款后循环已领次数大于当前可得总数仍能展示，未领次数归零且不自动追回', async t => {
  const data = cumulativeData(65800, 2);
  assert.equal(parseBackendWeeklyRebate(data).mode, WEEKLY_CUMULATIVE_MODE);
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(info, app.events.privateMessage({ text: '/周周返利', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []); assert.equal(result.messages.length, 1);
  const loop = quoteCards(result.messages[0].nodes).at(-1);
  assert.ok(loop); assert.match(loop.view.text, /累计可得：1次；已领：2次；当前可领：0次/);
  assert.deepEqual(loop.view.commands, []);
});

test('旧服务端逐日展示与第8项成功回执保持旧形态，不伪装新累充档', async t => {
  const legacy = { eligible: true, minAccountDays: 15, daysSinceRegistration: 15, weekStart: week, dailyThresholdAmount: 3000, todayDayOfWeek: 7, todayLabel: '周日', todayRechargedAmount: 3000, todayRechargedYuan: 30, todayRechargeText: '30', thresholdYuan: 30, claimedDays: [1, 2, 3, 4, 5, 6, 7], canClaimToday: false, canClaimBonus: true, rewards: [{ day: 8, label: '满勤大奖', statusTag: '', canClaim: true, spiritStone: 8, spiritCrystal: 0, spiritMilk: 0, items: [], rewardText: '灵石x8' }] };
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('/recharge.weekly-info') ? legacy : { dayIndex: 8, issued: [{ type: 'currency', name: '灵石', amount: 8 }] }));
  const query = await app.runHandler(info, app.events.privateMessage({ text: '/周周返利', platform: 'qq-bot' }));
  assert.deepEqual(quoteCards(query.messages[0].nodes)[0].view.commands, ['/周周返利领取 8']);
  const receipt = await app.runHandler(claim, app.events.privateMessage({ text: '/周周返利领取 8', platform: 'qq-bot' }));
  const view = inspectMessage(receipt.messages[0].nodes);
  assert.match(view.text, /满勤大奖 · 已领取/); assert.doesNotMatch(view.text, /累充8|循环返利/);
});

test('累充decoder拒绝金额失真、未知模式和不完整循环，但不改变历史回执', () => {
  const badMoney = cumulativeData(2950); badMoney.weekRechargeText = '30';
  assert.throws(() => parseBackendWeeklyRebate(badMoney), /金额展示/);
  const badLoop = cumulativeData(66800); badLoop.loop.expectedLoopCount = 1;
  assert.throws(() => parseBackendWeeklyRebate(badLoop), /循环进度/);
  assert.throws(() => parseBackendWeeklyRebate({ ...cumulativeData(), mode: 'unknown' }), /模式/);
  assert.deepEqual(parseRobotWeeklyRebateClaim({ dayIndex: 8, issued }), { dayIndex: 8, issued });
});

test('direct weekly SDK endpoint支持元门槛和冻结周期，循环JSON保持原总次数', async t => {
  const tier = { mode: WEEKLY_CUMULATIVE_MODE, rulesVersion: WEEKLY_CUMULATIVE_RULES, kind: 'tier', weekStart: week, thresholdAmount: 3000, thresholdYuan: 30, label: '累充30元档', issued };
  const { app, requests } = await gameFixture(t, request => request.path.includes('/loop/') ? { ...tier, kind: 'loop', thresholdAmount: 66800, thresholdYuan: 668, label: '循环返利', fromCount: 1, toCount: 2, claimedCount: 1 } : tier);
  const event = app.events.privateMessage({ text: '/周周返利', platform: 'qq-bot' });
  const result = await app.runHandler(async current => {
    const request = createBackendRequestContext(current, 'weekly-direct-fixture');
    assert.deepEqual(await claimBackendWeeklyRebate(current.UserId, 1, 30, request, week), issued);
    const loop = await claimBackendWeeklyRebateLoop(current.UserId, 1, week, 2, request);
    assert.equal(loop.mode, WEEKLY_CUMULATIVE_MODE);
  }, event);
  assert.deepEqual(result.errors, []); assert.equal(requests.length, 2);
  assert.equal(requests[0].path, '/api/v1/players/1/recharge/weekly-rebate/30/claim');
  assert.deepEqual(requests[0].body, { expectedWeekStart: week });
  assert.equal(requests[1].path, '/api/v1/players/1/recharge/weekly-rebate/loop/claim');
  assert.deepEqual(requests[1].body, { expectedWeekStart: week, expectedLoopCount: 2 });
});

test('周返利Expose投影保留新模式和循环总数，领取使用冻结日期并拒绝无快照循环', async t => {
  const protocol = 'xiuxian.weekly.fixture.v1';
  const tier = { mode: WEEKLY_CUMULATIVE_MODE, rulesVersion: WEEKLY_CUMULATIVE_RULES, kind: 'tier', delivery: 'inventory', weekStart: week, thresholdAmount: 3000, thresholdYuan: 30, label: '累充30元档', issued };
  const { app, requests } = await gameFixture(t, request => {
    const command = (request.body.arguments as { input?: string }).input ?? '';

    return businessEnvelope(request.bid, request.path.endsWith('/recharge.weekly-info') ? cumulativeData(66800, 1) : command.includes('循环') ? { ...tier, kind: 'loop', label: '循环返利', thresholdAmount: 66800, thresholdYuan: 668, fromCount: 1, toCount: 2, claimedCount: 1 } : tier);
  });
  const expose = Expose.create().provide({ name: protocol, description: 'Offline weekly contract fixture', actions: { get_weekly_recharge_rebate: membershipActions.get_weekly_recharge_rebate, claim_weekly_recharge_rebate: membershipActions.claim_weekly_recharge_rebate } });
  await app.mount({ expose }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ text: '/周周返利', platform: 'qq-bot' });
  const observed = await app.invoke(event, () => Expose.create().call(protocol, 'xiuxian-game', 'get_weekly_recharge_rebate', {}), 'ai-plugin');
  assert.equal(observed.value.ok, true, JSON.stringify(observed.value));
  if (observed.value.ok) {
    const result = observed.value.data as { result: { mode: string; weekStart: string; loop: { totalCount: number; claimedCount: number; claimableCount: number } } };
    assert.equal(result.result.mode, WEEKLY_CUMULATIVE_MODE); assert.equal(result.result.weekStart, week);
    assert.deepEqual([result.result.loop.totalCount, result.result.loop.claimedCount, result.result.loop.claimableCount], [2, 1, 1]);
  }
  for (const input of [{ kind: 'tier', thresholdYuan: 30, expectedWeekStart: week }, { kind: 'loop', expectedWeekStart: week, expectedLoopCount: 2 }]) {
    const settled = await app.invoke(event, () => Expose.create().call(protocol, 'xiuxian-game', 'claim_weekly_recharge_rebate', input), 'ai-plugin');
    assert.equal(settled.value.ok, true, JSON.stringify(settled.value));
    if (settled.value.ok) {
      const result = settled.value.data as { result: { kind: string; delivery: string } };
      assert.equal(result.result.kind, input.kind); assert.equal(result.result.delivery, 'inventory');
    }
  }
  assert.deepEqual(requests.slice(1).map(request => request.body.arguments), [{ input: `/周周返利领取 30 ${week}` }, { input: `/周周返利领取 循环 ${week} 2` }]);
  const count = requests.length;
  const invalid = await app.invoke(event, () => Expose.create().call(protocol, 'xiuxian-game', 'claim_weekly_recharge_rebate', { kind: 'loop', expectedLoopCount: 2 }), 'ai-plugin');
  assert.equal(invalid.value.ok, false); assert.equal(requests.length, count);
});
