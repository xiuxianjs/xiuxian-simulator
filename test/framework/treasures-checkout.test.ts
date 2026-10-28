import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { appendFileSync } from 'node:fs';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import pay from '../../src/response/recharge/pay/res';
import orders from '../../src/response/recharge/orders/res';
import treasures from '../../src/response/treasures/res';
import { ImageCache } from '../../src/utils/imageCdn';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setInterval', 'setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const rights = {
  name: '测试玩家', vipLevel: 1, totalRechargeAmount: 100, nextVipLevel: 2, nextVipThreshold: 200,
  firstRechargeTime: null, activeThemeConfig: null, canUseMeridian: false, canUseSoulPath: false,
  progressText: '', monthCardInstantRewards: [], seclusionPriceText: '', seclusionRewards: [],
  monthCard: { active: false, expireTime: null, remainingDays: 0, totalDays: 0, maxDays: 90, remainingQuota: 90, package: null,
    daily: { total: 0, claimableCount: 0, claimedCount: 0, upcomingCount: 0, calendarState: [] } },
  seclusionPass: { active: false, expireTime: null, remainingDays: 0, totalDays: 0, maxDays: 90, package: null }
};
const frozen = ['不参加首充返利', '不参加新人返利', '不参加限时累计返利', '不参加周返利', '实付计充值及VIP'];
const current = ['参加首充返利', '参加新人返利', '参加限时累计返利', '参加周返利', '实付计充值及VIP'];
const packs = {
  serverDate: '2026-10-28', unresolvedOrderNo: null,
  quotas: [{ sku: 'small', limit: 3, successful: 0, pending: 1, remaining: 2 }],
  products: [{ sku: 'small', name: '每日1元礼包', packageId: 31, priceAmount: 100, limit: 3, remaining: 2, available: true,
    unavailableReason: '', label: '超值300%', rewardParts: [{ kind: 'currency', name: '灵晶', quantity: 1500 }], promotionTexts: current }]
};
const orderNo = 'TD-original-policy';
const checkout = (promotionTexts: unknown = frozen, number = orderNo) => ({
  order: { orderNo: number, payAmount: 100, status: 'PENDING' },
  payUrl: 'https://payment.example.test/original', packageName: '每日1元礼包',
  ...(promotionTexts === undefined ? {} : { promotionTexts })
});
function delivered(result: TestRunResult) {
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  return result.messages.map(message => inspectMessage(message.nodes));
}
function assertManual(result: TestRunResult) {
  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const row = node as Record<string, unknown>;
      if (row.type === 'MD.button') assert.equal((row.options as Record<string, unknown>).autoEnter, false);
      if (Array.isArray(row.value)) walk(row.value);
    }
  };
  for (const message of result.messages) walk(message.nodes);
  assert.ok(!JSON.stringify(result.messages).includes('show='));
}

for (const mode of ['create', 'continue'] as const) {
  test(`daily pack ${mode} displays frozen order eligibility after the current offer changes`, async t => {
    const render = t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/pay.png');
    const { app, requests } = await gameFixture(t, request => {
      if (request.path.endsWith('treasures.daily-packs')) return businessEnvelope(request.bid, packs);
      if (request.path.endsWith('normal.payment-create')) return businessEnvelope(request.bid, { kind: 'checkout', checkout: checkout() });
      if (request.path.endsWith('membership.rights')) return businessEnvelope(request.bid, rights);
      if (request.path.endsWith('/checkout')) return checkout();
      return checkout().order;
    });
    const offer = delivered(await app.runHandler(treasures, app.events.privateMessage({ text: '/上古遗珍 礼包', platform: 'qq-bot' })));
    assert.ok(offer[0].text.includes('参加首充返利'));
    const result = await app.runHandler(mode === 'create' ? pay : orders, app.events.privateMessage({
      text: mode === 'create' ? '/充值购买 31' : `/继续支付 ${orderNo}`, platform: 'qq-bot'
    }));
    const views = delivered(result);
    const original = views.find(view => view.text.includes('本订单返利参与说明'));
    assert.ok(original);
    for (const line of frozen) assert.ok(original.text.includes(line));
    assert.ok(!original.text.split('\n').some(line => /^>?\s*参加首充返利/.test(line)));
    assert.ok(original.text.includes(orderNo));
    assert.equal(render.mock.callCount(), 1);
    assertManual(result);
    assert.ok(!requests.slice(1).some(request => request.path.endsWith('treasures.daily-packs')));
    if (mode === 'continue') assert.ok(!requests.some(request => request.path.endsWith('normal.payment-create')));
    if (mode === 'create' && process.env.TREASURE_CHECKOUT_PREVIEW_OUTPUT) {
      appendFileSync(process.env.TREASURE_CHECKOUT_PREVIEW_OUTPUT,
        `\n## 原订单返利资格（离线真实支付处理器）\n\n当前商品夹具为“参加首充返利”；原订单返回以下冻结说明，支付气泡采用原单说明。图片渲染由离线替身提供，平台未真实付款。\n\n${original.text}\n\n查询与恢复原单的蓝色链接均为手动发送（autoEnter:false）。\n`);
    }
  });
}

for (const mode of ['create', 'continue'] as const) {
  for (const promotion of [undefined, [], [''], '参加首充返利']) {
    test(`daily pack ${mode} keeps original order and blocks payment when eligibility is ${JSON.stringify(promotion)}`, async t => {
      const render = t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/pay.png');
      const value = promotion === undefined ? { ...checkout(), promotionTexts: undefined } : checkout(promotion);
      const { app, requests } = await gameFixture(t, request => {
        if (request.path.endsWith('normal.payment-create')) return businessEnvelope(request.bid, { kind: 'checkout', checkout: value });
        if (request.path.endsWith('membership.rights')) return businessEnvelope(request.bid, rights);
        if (request.path.endsWith('/checkout')) return value;
        return value.order;
      });
      const result = await app.runHandler(mode === 'create' ? pay : orders, app.events.privateMessage({
        text: mode === 'create' ? '/充值购买 31' : `/继续支付 ${orderNo}`, platform: 'qq-bot'
      }));
      const views = delivered(result);
      assert.ok(views.some(view => view.text.includes(orderNo) && view.text.includes('返利参与说明暂未取得')));
      const commands = views.flatMap(view => view.commands);
      assert.ok(commands.includes(`/继续支付 ${orderNo}`));
      assert.ok(commands.includes(`/查询充值订单 ${orderNo}`));
      assert.ok(!JSON.stringify(result.messages).includes('https://payment.example.test/original'));
      assert.equal(render.mock.callCount(), 0);
      assertManual(result);
      assert.equal(requests.filter(request => request.path.endsWith('normal.payment-create')).length, mode === 'create' ? 1 : 0);
    });
  }
}

for (const mode of ['create', 'continue'] as const) {
  test(`ordinary ${mode} without promotion metadata keeps the existing payment flow`, async t => {
    const render = t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/pay.png');
    const value = { ...checkout(frozen, 'N-ordinary'), promotionTexts: undefined };
    const { app } = await gameFixture(t, request => {
      if (request.path.endsWith('normal.payment-create')) return businessEnvelope(request.bid, { kind: 'checkout', checkout: value });
      if (request.path.endsWith('membership.rights')) return businessEnvelope(request.bid, rights);
      if (request.path.endsWith('/checkout')) return value;
      return value.order;
    });
    const result = await app.runHandler(mode === 'create' ? pay : orders, app.events.privateMessage({
      text: mode === 'create' ? '/充值购买 31' : '/继续支付 N-ordinary', platform: 'qq-bot'
    }));
    const views = delivered(result);
    assert.ok(views.some(view => view.text.includes('N-ordinary')));
    assert.ok(!views.some(view => view.text.includes('返利参与说明')));
    assert.equal(render.mock.callCount(), 1);
    assert.ok(JSON.stringify(result.messages).includes('https://payment.example.test/original'));
  });
}

test('continue checkout rejects a different order receipt before showing its policy or payment URL', async t => {
  const render = t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/pay.png');
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('membership.rights')) return businessEnvelope(request.bid, rights);
    if (request.path.endsWith('/checkout')) return checkout(frozen, 'TD-another-order');
    return checkout().order;
  });
  const result = await app.runHandler(orders, app.events.privateMessage({ text: `/继续支付 ${orderNo}`, platform: 'qq-bot' }));
  const views = delivered(result);
  assert.ok(views.some(view => view.commands.includes(`/继续支付 ${orderNo}`)));
  assert.ok(!JSON.stringify(result.messages).includes('https://payment.example.test/original'));
  assert.ok(!views.some(view => view.text.includes('TD-another-order')));
  assert.equal(render.mock.callCount(), 0);
  assert.ok(!requests.some(request => request.path.endsWith('normal.payment-create')));
});
