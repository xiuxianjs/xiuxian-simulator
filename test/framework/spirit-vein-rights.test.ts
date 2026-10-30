import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import rightsHandler from '../../src/response/monthCard/rights/res';
import ordersHandler from '../../src/response/recharge/orders/res';
import { businessEnvelope, gameFixture } from './fixture';

const previews = new Map<string, string>();
after(async () => {
  if (process.env.SPIRIT_VEIN_RIGHTS_PREVIEW_OUTPUT) {
    mkdirSync(dirname(process.env.SPIRIT_VEIN_RIGHTS_PREVIEW_OUTPUT), { recursive: true });
    writeFileSync(process.env.SPIRIT_VEIN_RIGHTS_PREVIEW_OUTPUT,
      '# 灵脉租契权益气泡离线预览\n\n由createTestApp运行真实权益处理器输出，后端与平台投递为夹具。\n\n' +
      [...previews].map(([title, content]) => `## ${title}\n\n${content}\n`).join('\n'));
  }
  await shutdownLogger();
});
const lease = () => ({
  active: true,
  startDate: '2026-10-24',
  endDate: '2026-11-22',
  remainingDays: 26,
  futureDays: 25,
  claimedDays: 3,
  totalDays: 30,
  claimableDays: 2,
  claimableCrystal: 6000,
  maxDays: 180,
  packageId: 27,
  priceAmount: 3000,
  dailyCrystal: 3000,
  immediateDaoCrystal: 300,
  canPurchase: true
});
const membership = () => ({
  name: '道友', vipLevel: 2, totalRechargeAmount: 3000, nextVipLevel: 3, nextVipThreshold: 6000, firstRechargeTime: null,
  activeThemeConfig: null, canUseMeridian: true, canUseSoulPath: false, progressText: '距VIP3还需30元',
  monthCardInstantRewards: [], seclusionPriceText: '金手指说明', seclusionRewards: [],
  monthCard: {
    active: true, expireTime: '2026-11-20T23:59:59+08:00', remainingDays: 23, totalDays: 30, maxDays: 90, remainingQuota: 60, package: null,
    daily: { total: 30, claimableCount: 1, claimedCount: 6, upcomingCount: 23, calendarState: [] }
  },
  seclusionPass: { active: false, expireTime: null, remainingDays: 0, totalDays: 0, maxDays: 90, package: null }
});

function facts(result: TestRunResult, title: string) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const sent = result.messages[0];

  assert.equal(result.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
  const walk = (nodes: unknown[]) => {
    for (const raw of nodes) {
      if (!raw || typeof raw !== 'object') continue;
      const node = raw as Record<string, unknown>;

      if (node.type === 'MD.button') {
        assert.equal((node.options as Record<string, unknown>)?.autoEnter, false);
      }
      if (Array.isArray(node.value)) walk(node.value);
    }
  };

  walk(sent.nodes);
  assert.ok(!JSON.stringify(sent.nodes).includes('show='));
  const value = inspectMessage(sent.nodes);

  previews.set(title, value.text + '\n\n手动指令：\n' + value.commands.map(command => `- \`${command}\``).join('\n'));

  return value;
}

async function selected(t: TestContext, command: string, data: unknown, operation = 'spirit-vein.overview') {
  const { app, requests } = await gameFixture(t, request => {
    assert.ok(request.path.endsWith(`/${operation}`), `独立租契页不应查询旧月卡：${request.path}`);

    return businessEnvelope(request.bid, data);
  });
  const view = facts(await app.runHandler(rightsHandler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

  assert.equal(requests.length, 1);

  return { view, requests };
}

for (const privateChat of [true, false]) test(`我的权益总览保留月卡并新增租契，链接均手动发送 private=${privateChat}`, async t => {
  const { app, requests } = await gameFixture(t, request =>
    request.path.endsWith('/membership.rights') ? businessEnvelope(request.bid, membership()) :
      request.path.endsWith('/spirit-vein.overview') ? businessEnvelope(request.bid, lease()) : {}
  );
  const event = privateChat ? app.events.privateMessage({ text: '/我的权益', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的权益', platform: 'qq-bot' });
  const view = facts(await app.runHandler(rightsHandler, event), `/我的权益 private=${privateChat}`);

  assert.match(view.text, /VIP 2 · 累计充值 ¥30\.00/);
  assert.match(view.text, /月卡 · 生效中/);
  assert.match(view.text, /金手指 · 未开通/);
  assert.match(view.text, /灵脉租契 · 生效中/);
  assert.match(view.text, /权益截止：2026-11-22/);
  assert.match(view.text, /可领 2 天 · 灵晶 6000（可补领）/);
  for (const command of ['/一键领取月卡', '/我的权益 月卡', '/我的权益 灵脉租契', '/充值 灵脉租契', '/灵脉租契 领取']) {
    assert.ok(view.commands.includes(command), command);
  }
  assert.equal(requests.length, 4);
  assert.equal(requests.filter(request => request.path.endsWith('/spirit-vein.overview')).length, 1);
});

test('总览租契查询失败保留原月卡权益，不把未知状态冒充未开通', async t => {
  const { app } = await gameFixture(t, request => request.path.endsWith('/membership.rights') ? businessEnvelope(request.bid, membership()) : {});
  const view = facts(await app.runHandler(rightsHandler, app.events.privateMessage({ text: '/我的权益', platform: 'qq-bot' })), '总览租契状态未知');

  assert.match(view.text, /月卡 · 生效中/);
  assert.match(view.text, /灵脉租契 · 状态暂未获取/);
  assert.doesNotMatch(view.text, /灵脉租契 · 未开通/);
  assert.ok(view.commands.includes('/一键领取月卡'));
  assert.ok(!view.commands.includes('/灵脉租契 领取'));
});

test('总览租契领域拒绝和异常身份都只显示未知，不另发反馈或串用另一账号权益', async t => {
  for (const mode of ['rejected', 'wrong-identity']) {
    const { app, requests } = await gameFixture(t, request => {
      if (request.path.endsWith('/membership.rights')) return businessEnvelope(request.bid, membership());
      if (!request.path.endsWith('/spirit-vein.overview')) return {};
      if (mode === 'rejected') return businessEnvelope(request.bid, undefined, [{
        title: '租契查询拒绝', heading: '', text: '租契暂不可查询', rawLines: ['可稍后重试租契'], buttons: [], advice: []
      }]);
      const envelope = businessEnvelope(request.bid, lease());

      envelope.middleware.identity.account.playerId = 2;

      return envelope;
    });
    const view = facts(await app.runHandler(rightsHandler, app.events.privateMessage({ text: '/我的权益', platform: 'qq-bot' })), `租契只读隔离 ${mode}`);

    assert.match(view.text, /月卡 · 生效中/);
    assert.match(view.text, /灵脉租契 · 状态暂未获取/);
    assert.doesNotMatch(view.text, /灵脉租契 · 生效中|租契查询拒绝/);
    assert.ok(!view.commands.includes('/灵脉租契 领取'));
    assert.ok(view.commands.includes('/我的权益 灵脉租契'));
    assert.equal(requests.length, 4);
  }
});

test('独立租契详情不依赖旧权益，已领与未来概况使用后端权威计数', async t => {
  const { view } = await selected(t, '/我的权益 灵脉租契', lease());

  assert.match(view.text, /权益开始：2026-10-24/);
  assert.match(view.text, /权益截止：2026-11-22/);
  assert.match(view.text, /累计已领 3 天 · 可领 2 天 · 未来 25 天/);
  assert.match(view.text, /已购权益共 30 个收益日/);
  for (const command of ['/灵脉租契 领取', '/我的权益 灵脉租契日历', '/充值 灵脉租契', '/我的订单']) {
    assert.ok(view.commands.includes(command), command);
  }
});

test('旧合同两天未领取权益按当前每日3000展示，保留已领取历史说明', async t => {
  const note = '新旧租契尚未领取的收益统一按每日3000灵晶结算；已领取历史保持原记录。';
  const { view } = await selected(t, '/我的权益 灵脉租契', { ...lease(), dailyCrystal: 3000, rightsNote: note });

  assert.match(view.text, /可领取灵晶 6000/);
  assert.ok(view.text.includes(note));
  assert.ok(!view.text.includes('可领取灵晶 4000'));
  assert.ok(view.commands.includes('/灵脉租契 领取'));
});

test('旧租契原始回执保留每日2000并注明当前未领收益统一3000', async t => {
  const orderNo = 'SV-frozen-v1';
  const receipt = {
    orderNo, packageRewards: { spiritMilk: 300, spiritStone: 0, spiritCrystal: 0, items: [], equipments: [], skills: [] },
    bonusSpiritMilk: 0, vipUpgrade: null, newcomerDayGranted: null, monthCardExtended: false, seclusionPassActivated: false,
    spiritVein: { days: 30, dailyCrystal: 2000, startDate: '2026-10-24', endDate: '2026-11-22' }
  };
  const { app, requests } = await gameFixture(t, request => request.path.endsWith('membership.rights') ? businessEnvelope(request.bid, membership())
    : request.path.endsWith('/settlement') ? receipt : { orderNo, payAmount: 3000, status: 'SUCCESS' });
  const view = facts(await app.runHandler(ordersHandler, app.events.privateMessage({ text: `/查询充值订单 ${orderNo}`, platform: 'qq-bot' })), '旧v1租契订单冻结回执');

  assert.match(view.text, /延长 30收益日，每日 2000灵晶/);
  assert.match(view.text, /本订单原始权益：延长 30收益日，每日 2000灵晶/);
  assert.match(view.text, /新旧租契尚未领取的收益统一按每日3000灵晶结算/);
  assert.match(view.text, /已领取历史保持原记录/);
  assert.equal(requests.length, 3);
  assert.ok(!requests.some(request => request.path.endsWith('spirit-vein.overview')));
});

test('租契到期仍显示可补领，不因active=false隐藏已到达收益', async t => {
  const { view } = await selected(t, '/我的权益 灵脉租契', {
    ...lease(), active: false, endDate: '2026-10-22', remainingDays: 0, futureDays: 0, claimedDays: 27, claimableDays: 3, claimableCrystal: 9000
  });

  assert.match(view.text, /灵脉租契 · 已到期 · 可补领/);
  assert.match(view.text, /可领取灵晶 9000/);
  assert.ok(view.commands.includes('/灵脉租契 领取'));
});

test('无到达收益不显示领取，缺少新计数字段不从余额反推已领日期', async t => {
  const { view } = await selected(t, '/我的权益 灵脉租契', {
    ...lease(), claimableDays: 0, claimableCrystal: 0, claimedDays: undefined, totalDays: undefined, futureDays: undefined
  });

  assert.match(view.text, /累计已领 待获取 · 可领 0 天 · 未来 待获取/);
  assert.match(view.text, /暂无可领取收益/);
  assert.ok(!view.commands.includes('/灵脉租契 领取'));
  assert.ok(view.commands.includes('/充值 灵脉租契'));
});

test('收益日历按后端分页与日期状态显示，分页蓝链手动发送', async t => {
  const { view, requests } = await selected(t, '/我的权益 灵脉租契日历 2', {
    page: 2, totalPages: 5, totalDays: 30,
    items: [
      { day: 8, rewardDate: '2026-10-27', spiritCrystal: 2000, state: 'claimed' },
      { day: 9, rewardDate: '2026-10-28', spiritCrystal: 3000, state: 'claimable' },
      { day: 10, rewardDate: '2026-10-29', spiritCrystal: 3000, state: 'upcoming' }
    ]
  }, 'spirit-vein.calendar');

  assert.equal((requests[0].body.arguments as Record<string, unknown>).page, 2);
  assert.match(view.text, /第 8 天 · 2026-10-27 · 已领取/);
  assert.match(view.text, /第 9 天 · 2026-10-28 · 可领取/);
  assert.match(view.text, /第 10 天 · 2026-10-29 · 未到领取日/);
  assert.match(view.text, /灵晶 ×2000/);
  assert.equal(view.text.match(/灵晶 ×3000/g)?.length, 2);
  for (const command of ['/我的权益 灵脉租契日历 1', '/我的权益 灵脉租契日历 3', '/充值 灵脉租契', '/我的订单']) {
    assert.ok(view.commands.includes(command), command);
  }
});

test('空收益日历不伪造日期，失效数据明确失败而不回落旧月卡', async t => {
  const empty = await selected(t, '/我的权益 灵脉租契日历', { page: 1, totalPages: 1, totalDays: 0, items: [] }, 'spirit-vein.calendar');

  assert.match(empty.view.text, /暂无收益日历/);
  assert.ok(!empty.view.commands.includes('/灵脉租契 领取'));
  const broken = await selected(t, '/我的权益 灵脉租契日历', {
    page: 1, totalPages: 1, totalDays: 30, items: [{ day: 1, rewardDate: '2026-10-28', spiritCrystal: 2000, state: 'unknown' }]
  }, 'spirit-vein.calendar');

  assert.match(broken.view.text, /灵脉租契权益暂未获取/);
  assert.doesNotMatch(broken.view.text, /已领取|未开通/);
});

test('所选租契加载失败明确说明，不假装未开通且不加载旧月卡', async t => {
  const { view } = await selected(t, '/我的权益 灵脉租契', {});

  assert.match(view.text, /灵脉租契权益暂未获取/);
  assert.doesNotMatch(view.text, /灵脉租契 · 未开通/);
});

test('收益日历非法页码在请求前拒绝，不悄悄打开旧权益总览', async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('无效页码不能请求后台'); });
  const view = facts(await app.runHandler(rightsHandler, app.events.privateMessage({ text: '/我的权益 灵脉租契日历 -1', platform: 'qq-bot' })), '收益日历页码无效');

  assert.match(view.text, /日历页码须为正整数/);
  assert.equal(requests.length, 0);
});
