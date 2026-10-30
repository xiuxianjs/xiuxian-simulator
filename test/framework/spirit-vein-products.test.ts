import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { writeFileSync } from 'node:fs';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import recharge from '../../src/response/recharge/info/res';
import treasures from '../../src/response/treasures/res';
import pay from '../../src/response/recharge/pay/res';
import responseRouter, { matchesGameCommand } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';
import { ImageCache } from '../../src/utils/imageCdn';

const previews = new Map<string, string>();
after(async () => {
  if (process.env.TREASURE_PRODUCTS_PREVIEW_OUTPUT) writeFileSync(process.env.TREASURE_PRODUCTS_PREVIEW_OUTPUT, [...previews].map(([title, text]) => `## ${title}\n\n${text}\n`).join('\n'), 'utf8');
  await shutdownLogger();
});
const reference = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const policy = ['不参加首充返利', '不参加新人返利', '不参加限时累计返利', '不参加周返利', '实付金额正常计入充值与VIP进度。'];
const catalog = { showNewcomerRebate: true, showWeeklyRebate: true, catalog: {
  packages: [], rewardNames: { items: {}, equipments: {}, skills: {} }, activityPackages: [],
  sponsor: { totalYuan: 0, thresholdYuan: 100, remainingYuan: 100, hasThemePermission: false },
  benefitView: { sponsorIntro: '赞助说明', monthCardPrivilegeLines: ['月卡权益说明'], seclusionPassPrivilegeLines: ['金手指权益说明'], seclusionPassFallbackLine: '暂未开放' }
} };
const lease = { active: false, canPurchase: true, startDate: null, endDate: null, remainingDays: 0, claimableDays: 0, claimableCrystal: 0, maxDays: 180, packageId: 99, priceAmount: 3000, dailyCrystal: 3000, immediateDaoCrystal: 300,
  rightsNote: '新旧租契尚未领取的收益统一按每日3000灵晶结算；已领取历史保持原记录。' };
function packs(free = false, unresolvedOrderNo: string | null = null) {
  return { serverDate: '2026-10-28', unresolvedOrderNo, quotas: [], products: [
    ...(['small', 'medium', 'large'] as const).map((sku, index) => ({ sku, name: `${[1, 6, 18][index]}元礼包`, packageId: 31 + index,
      priceAmount: [100, 600, 1800][index], basePriceAmount: [100, 600, 1800][index], creditedAmount: 0, canClaimFree: false,
      limit: [3, 2, 1][index], remaining: [3, 2, 1][index], available: true, unavailableReason: '', label: ['超值300%', '超值250%', '超值220%'][index], promotionTexts: policy,
      rewardParts: [
        { kind: 'dao_crystal', name: '道晶', quantity: [10, 60, 180][index] },
        ...(index === 0 ? [{ kind: 'spirit_crystal', name: '灵晶', quantity: 1500 }] : [{ kind: 'treasure_map', name: '藏宝图', quantity: [0, 5, 10][index] }]),
        { kind: 'treasure_fragment', name: ['稀有随机同名碎片', '史诗随机碎片', '神话随机碎片'][index], quantity: index === 0 ? 2 : 1, independentRolls: 1, perRoll: index === 0 ? 2 : 1 }
      ] })),
    { sku: 'all', name: '全包', packageId: 34, priceAmount: free ? 0 : 2700, basePriceAmount: 3000, creditedAmount: free ? 3000 : 300,
      canClaimFree: free, limit: 1, remaining: 1, available: !free, unavailableReason: free ? '本次无需付款，请领取剩余礼包' : '', label: '总展示估值262%', promotionTexts: free ? ['本次补齐无需付款，不增加充值金额与VIP进度。', '仅领取当日尚未购买的礼包份额。'] : policy,
      rewardParts: free ? [{ kind: 'dao_crystal', name: '道晶', quantity: 30 }, { kind: 'spirit_crystal', name: '灵晶', quantity: 4500 }, { kind: 'treasure_fragment', name: '稀有随机同名碎片', quantity: 6, independentRolls: 3, perRoll: 2 }]
        : [{ kind: 'dao_crystal', name: '道晶', quantity: 300 }, { kind: 'treasure_map', name: '藏宝图', quantity: 20 }, { kind: 'treasure_fragment', name: '史诗随机碎片', quantity: 2, independentRolls: 2, perRoll: 1 }, { kind: 'treasure_fragment', name: '神话随机碎片', quantity: 1, independentRolls: 1, perRoll: 1 }] }
  ] };
}
const freePreview = { kind: 'daily-pack-free', operationId: 'free-original', confirmationRef: reference, expiresAt: '2026-10-29T10:00:00+08:00', summary: ['全包原价30元，已付单项抵扣后本次0元；领取剩余1元礼包3份、6元礼包0份、18元礼包0份。', '获得道晶30、灵晶4500、藏宝图0及对应随机碎片。', '确认仅领取本次清单；库存、付款或业务日变化须重新预览。确认24小时有效，结果不明时重试原引用。'] };
const freeReceipt = { kind: 'daily-pack-free', operationId: 'free-original', result: { operationId: 'free-original', message: '剩余礼包领取完成', dailyTreasurePack: {
  sku: 'all', businessDate: '2026-10-28', spiritCrystal: 4500, daoCrystal: 30, treasureMaps: 0,
  fragments: [{ treasureId: 401, name: '采薇竹篮', rarity: 4, quantity: 2 }, { treasureId: 402, name: '长明青灯', rarity: 4, quantity: 2 }, { treasureId: 403, name: '丹砂玉匙', rarity: 4, quantity: 2 }], promotionTexts: []
} } };
function view(result: TestRunResult) {
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const walk = (nodes: unknown[]) => { for (const value of nodes) { const node = value as { type?: string; options?: Record<string, unknown>; value?: unknown }; if (node.type === 'MD.button') { assert.equal(node.options?.autoEnter, false); assert.ok(!Object.hasOwn(node.options ?? {}, 'show')); } if (Array.isArray(node.value)) walk(node.value); } };
  walk(message.nodes);
  return inspectMessage(message.nodes);
}

test('充值首页有两商品独立入口，租契标题与购买在引用外且权益在引用内', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('spirit-vein.overview') ? lease : catalog));
  const home = view(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值', platform: 'qq-bot' })));
  assert.ok(home.commands.includes('/充值 日礼包'));
  assert.ok(home.commands.includes('/充值 灵脉租契'));
  previews.set('/充值（商品分类入口）', home.text);
  const result = await app.runHandler(recharge, app.events.groupMessage({ text: '/充值 灵脉租契', platform: 'qq-bot' }));
  const product = view(result);
  assert.match(product.text, /灵脉租契 · ¥30.00/);
  assert.match(product.text, /300道晶/);
  assert.match(product.text, /新购每日 3000灵晶，共30收益日/);
  assert.match(product.text, /新旧租契尚未领取的收益统一按每日3000灵晶结算/);
  assert.ok(product.commands.includes('/充值购买 99'));
  const nodes = result.messages[0].nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
  const headingIndex = nodes.findIndex(node => node.type === 'MD.text' && node.value === '灵脉租契 · ¥30.00');
  const quoteIndex = nodes.findIndex((node, index) => index > headingIndex && node.type === 'MD.blockquote');
  const purchaseIndex = nodes.findIndex(node => node.type === 'MD.button' && node.options?.data === '/充值购买 99');
  assert.ok(headingIndex >= 0 && quoteIndex > headingIndex && purchaseIndex > quoteIndex);
  assert.ok(JSON.stringify(nodes[quoteIndex]).includes('购买即得 300道晶'));
  assert.ok(!JSON.stringify(nodes[quoteIndex]).includes('/充值购买 99'));
  assert.ok(!requests.some(request => request.path.includes('payment-create')));
  previews.set('/充值 灵脉租契（商品详情）', product.text);
});

for (const [tab, expected, price] of [['', '1元礼包', '1.00'], ['6元', '6元礼包', '6.00'], ['18元', '18元礼包', '18.00'], ['30元全包', '30元全包', '27.00']] as const) {
  test(`日礼包仅显示选中${tab || '默认1元'}档，服务端补差价原样显示`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : packs()));
    const result = view(await app.runHandler(recharge, app.events.privateMessage({ text: `/充值 日礼包 ${tab}`.trim(), platform: 'qq-bot' })));
    assert.match(result.text, /^每日礼包\n/);
    assert.ok(result.text.includes(`${expected} · ¥${price} · 每日限购`));
    assert.match(result.text, /(?:超值|总展示估值)\d+%！！！/);
    assert.equal(result.commands.filter(command => command.startsWith('/充值购买')).length, 1);
    for (const label of ['1元', '6元', '18元', '30元全包']) assert.ok(result.commands.includes(`/充值 日礼包 ${label}`));
    assert.equal(requests.length, 2);
    if (!tab) assert.match(result.text, /每日限购3\/3/);
    if (tab === '30元全包') { assert.match(result.text, /原价 ¥30.00 · 已计入单购金额 ¥3.00/); assert.match(result.text, /道晶 ×300/); assert.match(result.text, /藏宝图 ×20/); assert.doesNotMatch(result.text, /灵晶 ×4500|稀有随机同名碎片/); }
    previews.set(`/充值 日礼包 ${tab || '1元'}（单档商品）`, result.text);
  });
}

for (const text of ['/充值 日礼包', '/充值 每日礼包 6元', '/上古遗珍 礼包', '/上古遗珍 领取全包', `/确认礼包 ${reference}`, '/充值购买 31']) {
  test(`群聊${text.split(' ')[0]}不读商品或创建订单`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('群聊不得访问后端'); });
    const result = view(await app.runHandler(text.startsWith('/充值购买') ? pay : text.startsWith('/充值 ') ? recharge : treasures, app.events.groupMessage({ text, platform: 'qq-bot' })));
    assert.match(result.text, /仅支持私聊/);
    assert.doesNotMatch(result.text, /4500|超值|每日限购|order|采薇/);
    assert.equal(requests.length, 0);
  });
}

test('0元余权益优先领取，即available=false也不走充值下单；确认隐藏随机ID且原ref重放', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : request.path.endsWith('daily-pack-free-preview') ? freePreview : request.path.endsWith('daily-pack-free-confirm') ? freeReceipt : packs(true)));
  const product = view(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值 日礼包 30元全包', platform: 'qq-bot' })));
  assert.match(product.text, /¥0.00/);
  assert.ok(product.commands.includes('/上古遗珍 领取全包'));
  assert.ok(!product.commands.some(command => command.startsWith('/充值购买')));
  const confirmation = view(await app.runHandler(treasures, app.events.privateMessage({ text: '/上古遗珍 领取全包', platform: 'qq-bot' })));
  assert.doesNotMatch(confirmation.text, /采薇竹篮|401/);
  assert.ok(confirmation.commands.includes(`/确认礼包 ${reference}`));
  for (let i = 0; i < 2; i++) {
    const done = view(await app.runHandler(treasures, app.events.privateMessage({ text: `/确认礼包 ${reference}`, platform: 'qq-bot' })));
    assert.match(done.text, /操作编号 free-original/);
    assert.match(done.text, /采薇竹篮碎片 ×2/);
    assert.equal(app.clock.pending, 0);
    previews.set('0元剩余礼包领取回执（原操作可重放）', done.text);
  }
  assert.ok(!requests.some(request => request.path.includes('normal.payment-create')));
  const repeats = requests.filter(request => request.path.endsWith('daily-pack-free-confirm'));
  assert.equal(repeats.length, 2);
  assert.ok(repeats.every(request => JSON.stringify(request.body.arguments) === JSON.stringify({ confirmationRef: reference })));
  assert.ok(matchesGameCommand({ name: 'private.message.create', MessageText: `/确认礼包 ${reference}` }));
  previews.set('0元剩余礼包（领取而非创建订单）', product.text);
  previews.set('0元剩余礼包确认（随机内容不预告）', confirmation.text);
});

test('免费领取响应未知时仅用原ref重试，未决订单阻止任何新买入/领取', async t => {
  let first = true;
  const { app, requests } = await gameFixture(t, request => { if (request.path.endsWith('daily-pack-free-confirm')) { if (first) { first = false; throw new Error('响应中断'); } return businessEnvelope(request.bid, freeReceipt); } return businessEnvelope(request.bid, packs(true, 'TD-old-frozen')); });
  const pending = view(await app.runHandler(treasures, app.events.privateMessage({ text: '/上古遗珍 礼包 30元全包', platform: 'qq-bot' })));
  assert.match(pending.text, /TD-old-frozen/);
  assert.ok(!pending.commands.some(command => command.startsWith('/充值购买') || command === '/上古遗珍 领取全包'));
  const unknown = view(await app.runHandler(treasures, app.events.privateMessage({ text: `/确认礼包 ${reference}`, platform: 'qq-bot' })));
  assert.ok(unknown.commands.includes(`/确认礼包 ${reference}`));
  const restored = view(await app.runHandler(treasures, app.events.privateMessage({ text: `/确认礼包 ${reference}`, platform: 'qq-bot' })));
  assert.match(restored.text, /free-original/);
  assert.equal(requests.filter(request => request.path.endsWith('daily-pack-free-preview')).length, 0);
});

test('确认礼包正式路由到独立免费确认动作，不落入探索确认', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, freeReceipt));
  await app.mount({ responseRouter });
  const done = view(await app.dispatch(app.events.privateMessage({ text: `/确认礼包 ${reference}`, platform: 'qq-bot' })));
  assert.match(done.text, /每日礼包领取完成/);
  assert.equal(requests.length, 1);
  assert.ok(requests[0].path.endsWith('treasures.daily-pack-free-confirm'));
  assert.deepEqual(requests[0].body.arguments, { confirmationRef: reference });
});

for (const mode of ['packages', 'error', 'image-fallback'] as const) {
  test(`旧充值${mode}分支全部蓝链手动发送`, async t => {
    t.mock.method(ImageCache.prototype, 'getOrCreate', async () => null as never);
    const { app } = await gameFixture(t, request => {
      if (mode === 'error') throw new Error('模拟业务接口响应失败');
      return businessEnvelope(request.bid, mode === 'packages'
        ? { kind: 'packages', packages: [{ id: 1, name: '普通套餐', yuan: 1, priceAmount: 100, grantSpiritMilk: 10, doubleAvailable: false, doubleClaimed: false }] }
        : { kind: 'checkout', checkout: { order: { orderNo: 'N-original', status: 'PENDING', payAmount: 100 }, packageName: '普通套餐', payUrl: 'https://payment.example.test/original' } });
    });
    const result = await app.runHandler(pay, app.events.privateMessage({ text: '/充值购买 1', platform: 'qq-bot' }));
    assert.equal(result.messages.length, mode === 'image-fallback' ? 2 : 1);
    for (const message of result.messages) view({ ...result, messages: [message] });
    if (mode === 'image-fallback') assert.match(inspectMessage(result.messages[1].nodes).text, /支付图片生成失败/);
  });
}

test('旧充值已付成功分支真实轮询回执的全部蓝链手动发送', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/pay.png');
  const paymentOrder = { orderNo: 'N-original', status: 'PENDING', payAmount: 100 };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('normal.payment-create')
    ? { kind: 'checkout', checkout: { order: paymentOrder, packageName: '普通套餐', payUrl: 'https://payment.example.test/original' } }
    : { order: { ...paymentOrder, status: 'SUCCESS' }, timedOut: false, receipt: { orderNo: paymentOrder.orderNo, packageRewards: { spiritMilk: 10, spiritStone: 0, spiritCrystal: 0, items: [], equipments: [], skills: [] }, bonusSpiritMilk: 0, monthCardExtended: false, seclusionPassActivated: false } }));
  const event = app.events.privateMessage({ text: '/充值购买 1', platform: 'qq-bot' });
  try {
    const result = await app.runHandler(pay, event);
    for (const message of result.messages) view({ ...result, messages: [message] });
    // Native MockTimers do not retain AsyncLocalStorage; the official harness restores this callback's event/config scope.
    const polled = await app.invoke(event, async () => {
      t.mock.timers.tick(10000);
      const deadline = performance.now() + 2000;
      while (app.calls.filter(call => call.name === 'message.send').length < 3 && performance.now() < deadline) await nextTurn();
    });
    assert.equal(polled.messages.length, 1);
    assert.match(view(polled).text, /充值成功/);
    assert.equal(requests.filter(request => request.path.endsWith('normal.payment-create')).length, 1);
    assert.equal(requests.filter(request => request.path.endsWith('normal.payment-state')).length, 1);
  } finally {
    t.mock.timers.reset();
  }
});
