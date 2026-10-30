import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import recharge from '../../src/response/recharge/info/res';
import pay from '../../src/response/recharge/pay/res';
import orders from '../../src/response/recharge/orders/res';
import { ImageCache } from '../../src/utils/imageCdn';
import { parseRechargePeriodicPacks } from '../../src/api/bot/recharge-periodic-packs';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setInterval', 'setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const policy = ['不参加首充返利', '按活动原规则参加新人返利', '不参加限时累计返利', '按活动原规则参加周返利', '实付金额正常计入充值与VIP进度。'];
const displayPolicy = ['不参加首充返利', '不参加限时累计返利', '按活动原规则参加新人返利', '按活动原规则参加周周返利', '实付金额正常计入充值与VIP进度。'];
const oldWeeklyOnly = ['不参加首充返利', '不参加新人返利', '不参加限时累计返利', '按活动原规则参加周返利', '实付金额正常计入充值与VIP进度。'];
const oldThreePromotions = ['不参加首充返利', '按活动原规则参加新人返利', '按活动原规则参加限时累计返利', '按活动原规则参加周返利', '实付金额正常计入充值与VIP进度。'];
const frozen = ['不参加首充返利', '不参加新人返利', '不参加限时累计返利', '不参加周返利', '实付计充值及VIP'];
const catalog = {
  showNewcomerRebate: false, showWeeklyRebate: false,
  catalog: {
    packages: [], activityPackages: [], rewardNames: { items: {}, equipments: {}, skills: {} },
    sponsor: { totalYuan: 0, thresholdYuan: 100, remainingYuan: 100, hasThemePermission: false },
    benefitView: { sponsorIntro: '赞助说明', monthCardPrivilegeLines: ['月卡说明'], seclusionPassPrivilegeLines: ['金手指说明'], seclusionPassFallbackLine: '暂未开放' }
  }
};
const packs = {
  period: 'weekly', serverDate: '2026-10-30', periodStart: '2026-10-26', periodEnd: '2026-11-02', resetsAt: '2026-11-02T00:00:00+08:00',
  unresolvedOrderNo: null as string | null,
  products: [
    { sku: 'weekly30', name: '每周30元礼包', packageId: 41, priceAmount: 3000, label: '超值300%！',
      rewardParts: [{ kind: 'dao_crystal', name: '道晶', quantity: 300 }, { kind: 'spirit_crystal', name: '灵晶', quantity: 30000 }, { kind: 'treasure_map', name: '藏宝图', quantity: 25 }] },
    { sku: 'weekly68', name: '每周68元礼包', packageId: 42, priceAmount: 6800, label: '超值240%！',
      rewardParts: [{ kind: 'dao_crystal', name: '道晶', quantity: 680 }, { kind: 'treasure_map', name: '藏宝图', quantity: 80 }] },
    { sku: 'weekly98', name: '每周98元礼包', packageId: 43, priceAmount: 9800, label: '超值220%！',
      rewardParts: [{ kind: 'dao_crystal', name: '道晶', quantity: 980 }, { kind: 'treasure_map', name: '藏宝图', quantity: 80 }, { kind: 'lootbox', name: '史诗宝盒', quantity: 1 }] },
    { sku: 'weeklyAll', name: '每周288元全包', packageId: 44, priceAmount: 28800, label: '288元打包带走',
      rewardParts: [{ kind: 'dao_crystal', name: '道晶', quantity: 2940 }, { kind: 'spirit_crystal', name: '灵晶', quantity: 60000 }, { kind: 'treasure_map', name: '藏宝图', quantity: 290 }, { kind: 'lootbox', name: '史诗宝盒', quantity: 1 }] }
  ].map((product, index) => ({ ...product, isBundle: index === 3, basePriceAmount: product.priceAmount, creditedAmount: 0, limit: index < 2 ? 2 : 1, remaining: index < 2 ? 2 : 1, successful: 0, pending: 0, available: true, unavailableReason: '', promotionTexts: policy }))
};
const monthly = {
  period: 'monthly', serverDate: '2026-10-30', periodStart: '2026-10-01', periodEnd: '2026-11-01', resetsAt: '2026-11-01T00:00:00+08:00', unresolvedOrderNo: null,
  products: [
    { sku: 'monthlyMaps', name: '夺宝达人礼包', packageId: 51, priceAmount: 9800, label: '超值360%！', rewardParts: [{ kind: 'treasure_map', name: '藏宝图', quantity: 300 }] },
    { sku: 'monthlyVein', name: '超大大大大灵脉', packageId: 52, priceAmount: 9800, label: '超值300%！', rewardParts: [{ kind: 'spirit_crystal', name: '灵晶', quantity: 300000 }] },
    { sku: 'monthlyFamily', name: '宝物全家桶', packageId: 53, priceAmount: 9800, label: '超值160%', rewardParts: ['神话宝盒', '史诗宝盒', '稀有宝盒'].map(name => ({ kind: 'lootbox', name, quantity: name === '神话宝盒' ? 1 : 2 })) },
    { sku: 'monthlyAll', name: '宝物每月全包', packageId: 54, priceAmount: 28800, label: '288元打包带走', rewardParts: [
      { kind: 'treasure_map', name: '藏宝图', quantity: 300 }, { kind: 'spirit_crystal', name: '灵晶', quantity: 300000 },
      ...['神话宝盒', '史诗宝盒', '稀有宝盒'].map(name => ({ kind: 'lootbox', name, quantity: name === '神话宝盒' ? 1 : 2 }))
    ] }
  ].map((product, index) => ({ ...product, isBundle: index === 3, basePriceAmount: product.priceAmount, creditedAmount: 0, limit: 1, remaining: 1, successful: 0, pending: 0, available: true, unavailableReason: '', promotionTexts: policy }))
};
const rights = {
  name: '测试玩家', vipLevel: 1, totalRechargeAmount: 100, nextVipLevel: 2, nextVipThreshold: 200,
  firstRechargeTime: null, activeThemeConfig: null, canUseMeridian: false, canUseSoulPath: false,
  progressText: '', monthCardInstantRewards: [], seclusionPriceText: '', seclusionRewards: [],
  monthCard: { active: false, expireTime: null, remainingDays: 0, totalDays: 0, maxDays: 90, remainingQuota: 90, package: null,
    daily: { total: 0, claimableCount: 0, claimedCount: 0, upcomingCount: 0, calendarState: [] } },
  seclusionPass: { active: false, expireTime: null, remainingDays: 0, totalDays: 0, maxDays: 90, package: null }
};
type Node = { type?: string; value?: unknown; options?: Record<string, unknown> };
function delivered(result: TestRunResult) {
  assert.deepEqual(result.errors, []);
  const walk = (nodes: unknown[]) => {
    for (const raw of nodes) {
      const node = raw as Node;
      if (node.type === 'MD.button') {
        assert.equal(node.options?.autoEnter, false);
        assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
        const command = String(node.options?.data ?? '');
        assert.ok([...command].length <= 80, `${command}: ${[...command].length} Unicode characters, ${Buffer.byteLength(command)} UTF-8 bytes`);
      }
      if (Array.isArray(node.value)) { walk(node.value); }
    }
  };
  return result.messages.map(message => {
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    walk(message.nodes);

    return { view: inspectMessage(message.nodes), nodes: message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []) as Node[] };
  });
}

function assertRewardFormatting(nodes: Node[], rewards: Array<{ name: string; quantity: number }>, promotionTexts: string[]) {
  const quote = nodes.find(node => node.type === 'MD.blockquote');

  assert.ok(Array.isArray(quote?.value));
  const lines = quote.value as Node[];

  for (const reward of rewards) {
    const text = `${reward.name} ×${reward.quantity}`;

    assert.ok(lines.some(node => node.type === 'MD.bold' && node.value === text), `${text}名称与数量须整行加粗`);
    assert.ok(!lines.some(node => node.type === 'MD.text' && node.value === text));
  }
  for (const text of promotionTexts) {
    assert.ok(lines.some(node => node.type === 'MD.text' && node.value === text), '返利说明保持普通文本');
    assert.ok(!lines.some(node => node.type === 'MD.bold' && node.value === text));
  }
  const policies = lines.filter(node => node.type === 'MD.text' && promotionTexts.includes(String(node.value))).map(node => node.value);

  assert.deepEqual(policies, displayPolicy);
  assert.ok(lines.some((node, index) => node.type === 'MD.text' && node.value === '' && lines[index - 1]?.type === 'MD.newline' && lines[index + 1]?.type === 'MD.newline'));
}

for (const [index, tier] of ['30元', '68元', '98元', '288元全包'].entries()) {
  test(`周礼包${tier}真实处理器单档布局、奖励与支付入口`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : packs));
    const [message] = delivered(await app.runHandler(recharge, app.events.privateMessage({ text: `/充值 周礼包 ${tier}`, platform: 'qq-bot' })));
    const product = packs.products[index];
    const headingText = `${tier}${index === 3 ? '' : '礼包'} · ¥${product.priceAmount / 100}.00 · 每周限购${product.limit}/${product.limit}`;
    assert.ok(message.view.text.includes(headingText));
    assert.ok(message.view.commands.includes('/充值 周礼包 30元'));
    assert.ok(message.view.commands.includes('/充值 周礼包 68元'));
    assert.ok(message.view.commands.includes('/充值 周礼包 98元'));
    assert.ok(message.view.commands.includes('/充值 周礼包 288元全包'));
    assert.ok(message.view.commands.includes(`/充值购买 ${product.packageId}`));
    assert.equal(message.view.commands.filter(command => command.startsWith('/充值购买')).length, 1);
    const heading = message.nodes.findIndex(node => node.type === 'MD.text' && String(node.value).startsWith(headingText));
    const emphasis = message.nodes.findIndex(node => node.type === 'MD.bold' && node.value === product.label);
    const quote = message.nodes.findIndex(node => node.type === 'MD.blockquote');
    const purchase = message.nodes.findIndex(node => node.type === 'MD.button' && node.options?.data === `/充值购买 ${product.packageId}`);
    assert.ok(heading >= 0 && emphasis > heading && quote > emphasis && purchase > quote);
    const quoted = JSON.stringify(message.nodes[quote]);
    assertRewardFormatting(message.nodes, product.rewardParts, displayPolicy);
    for (const reward of product.rewardParts) { assert.ok(quoted.includes(`${reward.name} ×${reward.quantity}`)); }
    for (const line of displayPolicy) { assert.ok(quoted.includes(line)); }
    assert.match(message.view.text, /按活动原规则参加周周返利/);
    assert.ok(!message.view.text.includes('不参加周返利'));
    assert.ok(!quoted.includes('/充值购买'));
    assert.match(message.view.text, /本周自 2026-10-26 起，统一在 2026-11-02 00:00 刷新（北京时间，周期结束）/);
    assert.deepEqual(requests.map(request => request.path), ['/api/v2/robot/business/recharge.catalog', '/api/v2/robot/business/recharge.periodic-packs']);
    assert.equal((requests[1].body.arguments as Record<string, unknown>).period, 'weekly');
    assert.notEqual(requests[0].idempotencyKey, requests[1].idempotencyKey);
  });
}

test('充值首页保留周月入口，空商品不生成购买', async t => {
  const { app, requests } = await gameFixture(t, request => request.path.endsWith('/recharge/first') ? { names: { items: {}, equipments: {}, skills: {} }, tiers: [] }
    : businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : { ...packs, period: 'monthly', periodStart: '2026-10-01', periodEnd: '2026-11-01', resetsAt: '2026-11-01T00:00:00+08:00', products: [] }));
  const [home] = delivered(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值', platform: 'qq-bot' })));
  assert.ok(home.view.commands.includes('/充值 周礼包'));
  assert.ok(home.view.commands.includes('/充值 月礼包'));
  const [month] = delivered(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值 月礼包', platform: 'qq-bot' })));
  assert.match(month.view.text, /月礼包暂未开放/);
  assert.ok(!month.view.commands.some(command => command.startsWith('/充值购买')));
  assert.equal((requests.at(-1)?.body.arguments as Record<string, unknown>).period, 'monthly');
});

test('日礼包详情参加新人及周返利，首充限时资格仍排除', async t => {
  const daily = {
    serverDate: '2026-10-30', unresolvedOrderNo: null, quotas: [], products: [{
      sku: 'small', name: '每日1元礼包', packageId: 31, priceAmount: 100, basePriceAmount: 100, creditedAmount: 0,
      canClaimFree: false, limit: 3, remaining: 3, available: true, unavailableReason: '', label: '超值300%',
      rewardParts: [{ kind: 'dao_crystal', name: '道晶', quantity: 10 }], promotionTexts: policy
    }]
  };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : daily));
  const [message] = delivered(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值 日礼包', platform: 'qq-bot' })));

  assert.match(message.view.text, /按活动原规则参加周周返利/);
  for (const line of displayPolicy) { assert.ok(message.view.text.includes(line)); }
  assert.ok(!message.view.text.includes('不参加周返利'));
  assert.ok(message.view.commands.includes('/充值购买 31'));
  assert.equal(requests.at(-1)?.path, '/api/v2/robot/business/treasures.daily-packs');
});

for (const category of ['周礼包', '月礼包']) {
  test(`${category}群聊不读取商品、不创建订单`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('群聊不应访问后端'); });
    const [message] = delivered(await app.runHandler(recharge, app.events.groupMessage({ text: `/充值 ${category}`, platform: 'qq-bot' })));
    assert.match(message.view.text, /仅支持私聊/);
    assert.equal(requests.length, 0);
  });
}

test('周礼包未决原订单、售罄与返利信息缺失均不能另建支付', async t => {
  let current = structuredClone(packs);
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : current));
  for (const state of ['pending', 'sold-out', 'missing-policy', 'invalid-selection']) {
    current = structuredClone(packs);
    if (state === 'pending') { current.unresolvedOrderNo = `TP${'a'.repeat(32)}`; }
    if (state === 'sold-out') { Object.assign(current.products[0], { available: false, remaining: 0, successful: 2, unavailableReason: '本周已售罄' }); }
    if (state === 'missing-policy') { current.products[0].promotionTexts = []; }
    const [message] = delivered(await app.runHandler(recharge, app.events.privateMessage({ text: `/充值 周礼包 ${state === 'invalid-selection' ? '999元' : '30元'}`, platform: 'qq-bot' })));
    assert.ok(!message.view.commands.some(command => command.startsWith('/充值购买')));
    if (state === 'pending') { assert.ok(message.view.commands.includes(`/继续支付 ${current.unresolvedOrderNo}`)); }
    if (state === 'sold-out') { assert.match(message.view.text, /本周已售罄/); }
    if (state === 'missing-policy') { assert.match(message.view.text, /返利参与资格暂未取得/); }
    if (state === 'invalid-selection') { assert.match(message.view.text, /请选择30元、68元、98元、288元全包/); }
  }
});

test('周全包补差展示本次应付及剩余奖励，导航始终使用288元全包', async t => {
  const current = structuredClone(packs);
  Object.assign(current.products[3], { priceAmount: 2400, creditedAmount: 26400,
    rewardParts: [{ kind: 'dao_crystal', name: '道晶', quantity: 300 }, { kind: 'spirit_crystal', name: '灵晶', quantity: 30000 }, { kind: 'treasure_map', name: '藏宝图', quantity: 25 }] });
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : current));
  const [message] = delivered(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值 周礼包 288元全包', platform: 'qq-bot' })));
  assert.match(message.view.text, /288元全包 · ¥24.00/);
  assert.match(message.view.text, /原价 ¥288.00 · 已计入单购金额 ¥264.00/);
  assert.match(message.view.text, /仅补齐剩余权益/);
  assert.match(message.view.text, /藏宝图 ×25/);
  assert.ok(!message.view.text.includes('藏宝图 ×290'));
  assert.ok(message.view.commands.includes('/充值 周礼包 288元全包'));
  assert.ok(!message.view.commands.includes('/充值 周礼包 24元'));
  assert.ok(message.view.commands.includes('/充值购买 44'));
});

test('周全包份额全部买齐时0元展示不产生免费领取或支付按钮', async t => {
  const current = structuredClone(packs);
  Object.assign(current.products[3], { priceAmount: 0, creditedAmount: 29400, available: false, remaining: 0, rewardParts: [], unavailableReason: '本周礼包份额已全部购买' });
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : current));
  const [message] = delivered(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值 周礼包 288元全包', platform: 'qq-bot' })));
  assert.match(message.view.text, /本周礼包份额已全部购买/);
  assert.ok(!message.view.commands.some(command => command.startsWith('/充值购买') || command.includes('领取全包')));
});

test('周礼包业务拒绝保留服务端原因、引用、建议与手动蓝链', async t => {
  const { app } = await gameFixture(t, request => request.path.endsWith('recharge.catalog') ? businessEnvelope(request.bid, catalog)
    : businessEnvelope(request.bid, undefined, [{ title: '礼包暂不可购买', heading: '请核对原订单', text: '原订单结果尚未确认', quote: '保留原操作编号',
      buttons: [{ label: '我的订单', command: '/我的订单' }], advice: [{ description: '先查询原订单状态', command: '/查询充值订单 TP-original' }],
      blocks: [{ text: '支持继续查询', quoted: true, inlineButtons: [{ label: '继续查询', command: '/我的订单' }] }] }]));
  const [message] = delivered(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值 周礼包', platform: 'qq-bot' })));
  assert.match(message.view.text, /原订单结果尚未确认/);
  assert.match(message.view.text, /保留原操作编号/);
  assert.match(message.view.text, /先查询原订单状态/);
  assert.ok(message.view.commands.includes('/查询充值订单 TP-original'));
  assert.ok(message.view.commands.includes('/我的权益'));
});

for (const mode of ['create', 'continue'] as const) {
  for (const withPolicy of [true, false]) {
    test(`周礼包${mode}支付使用原订单冻结返利，缺失=${!withPolicy}`, async t => {
      const render = t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/pay.png');
      const orderNo = `TP${'b'.repeat(32)}`;
      const checkout = { order: { orderNo, payAmount: 3000, status: 'PENDING' }, packageName: '每周30元礼包', payUrl: 'https://payment.example.test/original', ...(withPolicy ? { promotionTexts: frozen } : {}) };
      const { app, requests } = await gameFixture(t, request => {
        if (request.path.endsWith('normal.payment-create')) { return businessEnvelope(request.bid, { kind: 'checkout', checkout }); }
        if (request.path.endsWith('membership.rights')) { return businessEnvelope(request.bid, rights); }
        if (request.path.endsWith('/checkout')) { return checkout; }

        return checkout.order;
      });
      const messages = delivered(await app.runHandler(mode === 'create' ? pay : orders, app.events.privateMessage({ text: mode === 'create' ? '/充值购买 41' : `/继续支付 ${orderNo}`, platform: 'qq-bot' })));
      if (withPolicy) {
        const original = messages.find(message => message.view.text.includes('本订单返利参与说明'));
        assert.ok(original);
        for (const line of frozen) { assert.ok(original.view.text.includes(line)); }
        assert.equal(render.mock.callCount(), 1);
      } else {
        assert.ok(messages.some(message => message.view.text.includes('返利参与说明暂未取得') && message.view.text.includes(orderNo)));
        assert.ok(!JSON.stringify(messages).includes(checkout.payUrl));
        assert.equal(render.mock.callCount(), 0);
      }
      assert.equal(requests.filter(request => request.path.endsWith('normal.payment-create')).length, mode === 'create' ? 1 : 0);
      assert.ok(!requests.some(request => request.path.endsWith('recharge.periodic-packs')));
    });
  }
}

test('周礼包已完成订单只渲染真实回执，币种不重复', async t => {
  const orderNo = `TP${'c'.repeat(32)}`;
  const receipt = {
    orderNo, packageRewards: { spiritMilk: 300, spiritStone: 0, spiritCrystal: 30000, items: [], equipments: [], skills: [] },
    bonusSpiritMilk: 0, vipUpgrade: null, newcomerDayGranted: null, monthCardExtended: false, seclusionPassActivated: false,
    periodicPack: { sku: 'weekly30', period: 'weekly', periodStart: packs.periodStart, periodEnd: packs.periodEnd, daoCrystal: 300, spiritCrystal: 30000, treasureMaps: 25, promotionTexts: frozen, items: [] }
  };
  const { app, requests } = await gameFixture(t, request => request.path.endsWith('membership.rights') ? businessEnvelope(request.bid, rights)
    : request.path.endsWith('/settlement') ? receipt : { orderNo, payAmount: 3000, status: 'SUCCESS' });
  const [message] = delivered(await app.runHandler(orders, app.events.privateMessage({ text: `/查询充值订单 ${orderNo}`, platform: 'qq-bot' })));
  assert.match(message.view.text, /周礼包 · 2026-10-26 期/);
  assert.match(message.view.text, /藏宝图 \+25/);
  assert.equal(message.view.text.match(/道晶 \+300/g)?.length, 1);
  assert.equal(message.view.text.match(/灵晶 \+30000/g)?.length, 1);
  assert.ok(message.view.commands.includes('/充值 周礼包'));
  assert.ok(!requests.some(request => request.path.endsWith('normal.payment-create')));
});

test('周礼包史诗宝盒按真实lootbox回执显示一次', async t => {
  const orderNo = `TP${'d'.repeat(32)}`;
  const receipt = {
    orderNo, packageRewards: { spiritMilk: 980, spiritStone: 0, spiritCrystal: 0, items: [], equipments: [], skills: [] },
    bonusSpiritMilk: 0, vipUpgrade: null, newcomerDayGranted: null, monthCardExtended: false, seclusionPassActivated: false,
    periodicPack: { sku: 'weekly98', period: 'weekly', periodStart: packs.periodStart, periodEnd: packs.periodEnd, daoCrystal: 980, spiritCrystal: 0, treasureMaps: 80, promotionTexts: frozen,
      items: [{ kind: 'lootbox', lootboxId: 987, name: '史诗宝盒', quantity: 1 }] }
  };
  const { app } = await gameFixture(t, request => request.path.endsWith('membership.rights') ? businessEnvelope(request.bid, rights)
    : request.path.endsWith('/settlement') ? receipt : { orderNo, payAmount: 9800, status: 'SUCCESS' });
  const [message] = delivered(await app.runHandler(orders, app.events.privateMessage({ text: `/查询充值订单 ${orderNo}`, platform: 'qq-bot' })));
  assert.equal(message.view.text.match(/史诗宝盒 ×1/g)?.length, 1);
  assert.match(message.view.text, /藏宝图 \+80/);
  assert.ok(!message.view.text.includes('987'));
});

test('周期商品响应拒绝损坏配额、重复档位和超长恢复指令', () => {
  const invalid = structuredClone(packs);
  invalid.products[0].remaining = 3;
  assert.throws(() => parseRechargePeriodicPacks(invalid));
  const duplicate = structuredClone(packs);
  duplicate.products.push(duplicate.products[0]);
  assert.throws(() => parseRechargePeriodicPacks(duplicate));
  assert.throws(() => parseRechargePeriodicPacks({ ...packs, unresolvedOrderNo: 'TP'.repeat(40) }));
});

for (const [index, product] of monthly.products.entries()) {
  test(`月礼包${product.name}同价独立选择、保留准确商品名和奖励`, async t => {
    const selected = product.isBundle ? '288元全包' : product.name;
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : monthly));
    const [message] = delivered(await app.runHandler(recharge, app.events.privateMessage({ text: `/充值 月礼包 ${selected}`, platform: 'qq-bot' })));
    assert.ok(message.view.text.includes(`${selected} · ¥${(product.priceAmount / 100).toFixed(2)} · 每月限购1/1`));
    assert.ok(message.view.text.includes(product.label));
    assert.deepEqual(message.view.commands.filter(command => command.startsWith('/充值购买')), [`/充值购买 ${product.packageId}`]);
    for (const item of monthly.products) {
      assert.ok(message.view.commands.includes(`/充值 月礼包 ${item.isBundle ? '288元全包' : item.name}`));
    }
    for (const reward of product.rewardParts) { assert.ok(message.view.text.includes(`${reward.name} ×${reward.quantity}`)); }
    assertRewardFormatting(message.nodes, product.rewardParts, displayPolicy);
    assert.match(message.view.text, /按活动原规则参加周周返利/);
    assert.ok(!message.view.text.includes('不参加周返利'));
    assert.match(message.view.text, /本月自 2026-10-01 起，统一在 2026-11-01 00:00 刷新（北京时间，周期结束）/);
    assert.ok(!message.view.text.includes('道晶'));
    if (index === 1) { assert.ok(message.view.text.includes('超大大大大灵脉')); }
    assert.equal((requests[1].body.arguments as Record<string, unknown>).period, 'monthly');
  });
}

test('月礼包98元同价输入不猜商品，全包92元补差仍保留288元档导航', async t => {
  const current = structuredClone(monthly);
  Object.assign(current.products[3], { priceAmount: 9200, creditedAmount: 19600, rewardParts: monthly.products[2].rewardParts });
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : current));
  const [ambiguous] = delivered(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值 月礼包 98元', platform: 'qq-bot' })));
  assert.ok(!ambiguous.view.commands.some(command => command.startsWith('/充值购买')));
  assert.match(ambiguous.view.text, /请选择夺宝达人礼包、超大大大大灵脉、宝物全家桶、288元全包/);
  const [bundle] = delivered(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值 月礼包 288元全包', platform: 'qq-bot' })));
  assert.match(bundle.view.text, /288元全包 · ¥92.00/);
  assert.match(bundle.view.text, /原价 ¥288.00 · 已计入单购金额 ¥196.00/);
  assert.ok(bundle.view.commands.includes('/充值 月礼包 288元全包'));
  assert.ok(!bundle.view.commands.includes('/充值 月礼包 92元'));
  assert.deepEqual(bundle.view.commands.filter(command => command.startsWith('/充值购买')), ['/充值购买 54']);
  assert.ok(bundle.view.text.includes('神话宝盒 ×1'));
  assert.ok(!bundle.view.text.includes('神话宝盒 ×2'));
  for (const box of ['史诗宝盒', '稀有宝盒']) { assert.ok(bundle.view.text.includes(`${box} ×2`)); }
  assert.ok(!bundle.view.text.includes('道晶'));
  assert.ok(!bundle.view.text.includes('藏宝图 ×300'));
  assert.ok(!bundle.view.text.includes('灵晶 ×300000'));
});

test('月礼包沿原充值购买创建并从实际回执展示三种宝盒，不追加直充道晶', async t => {
  t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/pay.png');
  const orderNo = `TP${'e'.repeat(32)}`;
  const checkout = { order: { orderNo, payAmount: 9800, status: 'PENDING' }, packageName: '宝物全家桶', payUrl: 'https://payment.example.test/monthly', promotionTexts: frozen };
  const receipt = {
    orderNo, packageRewards: { spiritMilk: 0, spiritStone: 0, spiritCrystal: 0, items: [], equipments: [], skills: [] },
    bonusSpiritMilk: 0, vipUpgrade: null, newcomerDayGranted: null, monthCardExtended: false, seclusionPassActivated: false,
    periodicPack: { sku: 'monthlyFamily', period: 'monthly', periodStart: monthly.periodStart, periodEnd: monthly.periodEnd, daoCrystal: 0, spiritCrystal: 0, treasureMaps: 0, promotionTexts: frozen,
      items: ['神话宝盒', '史诗宝盒', '稀有宝盒'].map((name, index) => ({ kind: 'lootbox', lootboxId: 900 + index, name, quantity: name === '神话宝盒' ? 1 : 2 })) }
  };
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('normal.payment-create')) { return businessEnvelope(request.bid, { kind: 'checkout', checkout }); }
    if (request.path.endsWith('membership.rights')) { return businessEnvelope(request.bid, rights); }
    if (request.path.endsWith('/settlement')) { return receipt; }

    return { ...checkout.order, status: 'SUCCESS' };
  });
  const created = delivered(await app.runHandler(pay, app.events.privateMessage({ text: '/充值购买 53', platform: 'qq-bot' })));
  assert.ok(created.some(message => message.view.text.includes('宝物全家桶')));
  const [settled] = delivered(await app.runHandler(orders, app.events.privateMessage({ text: `/查询充值订单 ${orderNo}`, platform: 'qq-bot' })));
  assert.match(settled.view.text, /月礼包 · 2026-10-01 期/);
  assert.equal(settled.view.text.split('神话宝盒 ×1').length - 1, 1);
  assert.ok(!settled.view.text.includes('神话宝盒 ×2'));
  for (const box of ['史诗宝盒', '稀有宝盒']) { assert.equal(settled.view.text.split(`${box} ×2`).length - 1, 1); }
  assert.ok(!settled.view.text.includes('道晶'));
  assert.ok(!settled.view.text.includes('碎片'));
  assert.ok(settled.view.commands.includes('/充值 月礼包'));
  assert.equal(requests.filter(request => request.path.endsWith('normal.payment-create')).length, 1);
  assert.equal((requests[0].body.arguments as Record<string, unknown>).input, '/充值购买 53');
});

for (const [kind, prefix, packageId, payAmount, packageName] of [
  ['日礼包', 'TD', 31, 100, '每日1元礼包'], ['周礼包', 'TP', 41, 3000, '每周30元礼包'], ['月礼包', 'TP', 51, 9800, '夺宝达人礼包']
] as const) {
  for (const mode of ['create', 'continue'] as const) {
    test(`${kind}${mode}沿原单展示新人及周返利，首充限时资格仍排除`, async t => {
      t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/pay.png');
      const orderNo = `${prefix}-new-weekly-rebate-${packageId}`;
      const checkout = { order: { orderNo, payAmount, status: 'PENDING' }, packageName, payUrl: 'https://payment.example.test/weekly-rebate', promotionTexts: policy };
      const { app, requests } = await gameFixture(t, request => {
        if (request.path.endsWith('normal.payment-create')) { return businessEnvelope(request.bid, { kind: 'checkout', checkout }); }
        if (request.path.endsWith('membership.rights')) { return businessEnvelope(request.bid, rights); }
        if (request.path.endsWith('/checkout')) { return checkout; }

        return checkout.order;
      });
      const messages = delivered(await app.runHandler(mode === 'create' ? pay : orders, app.events.privateMessage({
        text: mode === 'create' ? `/充值购买 ${packageId}` : `/继续支付 ${orderNo}`, platform: 'qq-bot'
      })));
      const original = messages.find(message => message.view.text.includes('本订单返利参与说明'));

      assert.ok(original);
      for (const line of policy) { assert.ok(original.view.text.includes(line)); }
      assert.ok(!original.view.text.includes('不参加周返利'));
      assert.equal(requests.filter(request => request.path.endsWith('normal.payment-create')).length, mode === 'create' ? 1 : 0);
      assert.ok(!requests.some(request => request.path.endsWith('treasures.daily-packs') || request.path.endsWith('recharge.periodic-packs')));
    });
  }
  test(`${kind}恢复旧only-weekly原单不增加新人及限时返利资格`, async t => {
    t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/pay.png');
    const orderNo = `${prefix}-old-only-weekly-${packageId}`;
    const checkout = { order: { orderNo, payAmount, status: 'PENDING' }, packageName, payUrl: 'https://payment.example.test/old-weekly-only', promotionTexts: oldWeeklyOnly };
    const { app, requests } = await gameFixture(t, request => {
      if (request.path.endsWith('membership.rights')) { return businessEnvelope(request.bid, rights); }
      if (request.path.endsWith('/checkout')) { return checkout; }

      return checkout.order;
    });
    const messages = delivered(await app.runHandler(orders, app.events.privateMessage({ text: `/继续支付 ${orderNo}`, platform: 'qq-bot' })));
    const original = messages.find(message => message.view.text.includes('本订单返利参与说明'));

    assert.ok(original);
    for (const line of oldWeeklyOnly) { assert.ok(original.view.text.includes(line)); }
    assert.ok(!original.view.text.includes('按活动原规则参加新人返利'));
    assert.ok(!original.view.text.includes('按活动原规则参加限时累计返利'));
    assert.ok(!requests.some(request => request.path.endsWith('normal.payment-create') || request.path.endsWith('recharge.periodic-packs')));
  });
  test(`${kind}恢复旧明确参加限时的原单不被当前排除规则覆盖`, async t => {
    t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/pay.png');
    const orderNo = `${prefix}-old-three-promotions-${packageId}`;
    const checkout = { order: { orderNo, payAmount, status: 'PENDING' }, packageName, payUrl: 'https://payment.example.test/old-three-promotions', promotionTexts: oldThreePromotions };
    const { app, requests } = await gameFixture(t, request => {
      if (request.path.endsWith('membership.rights')) { return businessEnvelope(request.bid, rights); }
      if (request.path.endsWith('/checkout')) { return checkout; }

      return checkout.order;
    });
    const messages = delivered(await app.runHandler(orders, app.events.privateMessage({ text: `/继续支付 ${orderNo}`, platform: 'qq-bot' })));
    const original = messages.find(message => message.view.text.includes('本订单返利参与说明'));

    assert.ok(original);
    for (const line of oldThreePromotions) { assert.ok(original.view.text.includes(line)); }
    assert.ok(!original.view.text.includes('不参加限时累计返利'));
    assert.ok(!requests.some(request => request.path.endsWith('normal.payment-create') || request.path.endsWith('recharge.periodic-packs')));
  });
}
