import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import { parseTreasureMerchant } from '../../src/api/bot/treasures';
import handler from '../../src/response/treasures/res';
import { matchesGameCommand } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

const confirmationRef = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const operationId = 'merchant-frozen-original';
const previews: Array<{ command: string; text: string; commands: string[]; nodes: unknown[] }> = [];

function merchant(mapPrice = 10) {
  return {
    rulesVersion: 'treasure-merchant-v2-box-prices-20261031',
    poolVersion: 'treasure-36-v2',
    xianYun: 5000,
    weekStart: '2026-10-26',
    weekEnd: '2026-11-02',
    monthStart: '2026-10-01',
    monthEnd: '2026-11-01',
    products: [
      { sku: 'treasure_map', name: '藏宝图', kind: 'map', rarity: 0, unitPrice: mapPrice, period: 'weekly', limit: 10, purchased: 0, remaining: 10, maxQuantity: 10, tier: mapPrice === 10 ? 1 : 2, nextUnitPrice: mapPrice === 10 ? 15 : 20 },
      { sku: 'rare_fragment', name: '随机稀有碎片', kind: 'fragment', rarity: 4, unitPrice: 12, period: 'weekly', limit: 50, purchased: 0, remaining: 50, maxQuantity: 50 },
      { sku: 'epic_fragment', name: '随机史诗碎片', kind: 'fragment', rarity: 5, unitPrice: 25, period: 'weekly', limit: 20, purchased: 0, remaining: 20, maxQuantity: 20 },
      { sku: 'mythic_fragment', name: '随机神话碎片', kind: 'fragment', rarity: 6, unitPrice: 60, period: 'weekly', limit: 10, purchased: 0, remaining: 10, maxQuantity: 10 },
      { sku: 'rare_box', name: '稀有礼盒', kind: 'lootbox', rarity: 4, unitPrice: 160, period: 'monthly', limit: 5, purchased: 0, remaining: 5, maxQuantity: 5 },
      { sku: 'epic_box', name: '史诗礼盒', kind: 'lootbox', rarity: 5, unitPrice: 400, period: 'monthly', limit: 2, purchased: 0, remaining: 2, maxQuantity: 2 },
      { sku: 'mythic_box', name: '神话礼盒', kind: 'lootbox', rarity: 6, unitPrice: 1000, period: 'monthly', limit: 1, purchased: 0, remaining: 1, maxQuantity: 1 }
    ].map(product => ({ ...product, periodKey: product.period === 'weekly' ? '2026-10-26' : '2026-10-01', available: true, unavailableReason: '' }))
  };
}

const preview = {
  kind: 'merchant-exchange',
  operationId,
  confirmationRef,
  expiresAt: '2026-10-31T19:00:00+08:00',
  summary: ['兑换藏宝图3张，消耗30仙蕴。', '本周报价10仙蕴/张，按本次清单结算。']
};

function delivered(result: TestRunResult, command: string, expectedMessages = 1) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, expectedMessages);
  const walk = (nodes: unknown[]) => {
    for (const value of nodes) {
      if (!value || typeof value !== 'object') continue;
      const node = value as { type?: string; value?: unknown; options?: Record<string, unknown> };

      if (node.type === 'MD.button') {
        assert.equal(node.options?.autoEnter, false);
        assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
        assert.ok([...String(node.options?.data)].length <= 80);
      }
      if (Array.isArray(node.value)) walk(node.value);
    }
  };

  for (const message of result.messages) {
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    walk(message.nodes);
  }
  const view = inspectMessage(result.messages.at(-1)!.nodes);

  previews.push({ command, text: view.text, commands: view.commands, nodes: result.messages.at(-1)!.nodes });

  return view;
}

after(async () => {
  const output = process.env.TREASURE_MERCHANT_PREVIEW_OUTPUT;

  if (output) {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify({ note: '真实 createTestApp 处理器与 Format 的离线消息节点；后端及平台投递由夹具模拟。', previews }, null, 2) + '\n');
  }
  await shutdownLogger();
});

test('秘宝商人沿用商店商品引用布局，仅展示一条藏宝图且所有兑换入口手动发送', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, merchant()));
  const command = '/上古遗珍 秘宝商人';

  assert.ok(matchesGameCommand({ name: 'private.message.create', MessageText: command }));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
  const view = delivered(result, command);

  assert.match(view.text, /仙蕴：5000/);
  assert.equal([...view.text.matchAll(/【\d】藏宝图 ×1/g)].length, 1);
  for (const text of ['价格：10仙蕴', '价格：12仙蕴', '价格：25仙蕴', '价格：60仙蕴', '价格：160仙蕴', '价格：400仙蕴', '价格：1,000仙蕴', '周限购50 · 剩余50', '月限购5 · 剩余5', '开启时自选一件同稀有度完整宝物']) assert.ok(view.text.includes(text), text);
  assert.equal(view.commands.filter(command => command.startsWith('/上古遗珍 兑换 ')).length, 7);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/treasures.merchant');
  assert.deepEqual(requests[0].body.arguments, {});
  const topLevel = result.messages[0].nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
  const quotes = topLevel.filter(node => node.type === 'MD.blockquote');

  assert.ok(topLevel.some(node => node.type === 'MD.text' && node.value === '仙蕴：5000'), '余额显示在正文');
  assert.equal(quotes.length, 7, '每个商品单独一块，余额不放入引用块');
  assert.ok(quotes.every(node => JSON.stringify(node).includes('价格：')));
  for (const [index, quote] of quotes.entries()) {
    assert.ok(Array.isArray(quote.value));
    assert.equal(quote.value[0].type, 'MD.bold');
    assert.equal(quote.value[0].value, `【${index + 1}】${merchant().products[index].name} ×1`);
  }
});

test('兑换只请求原商品的新报价并进入确认，未发送确认命令不会扣仙蕴', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('/treasures.merchant') ? merchant() : preview));
  const command = '/上古遗珍 兑换 treasure_map 3';
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

  assert.match(view.text, /消耗30仙蕴/);
  assert.ok(view.commands.includes(`/确认宝物 ${confirmationRef}`));
  assert.ok(view.commands.includes('/上古遗珍 秘宝商人'));
  assert.equal(requests.length, 2);
  assert.equal(requests[0].path, '/api/v2/robot/business/treasures.merchant');
  assert.equal(requests[1].path, '/api/v2/robot/business/treasures.preview');
  assert.deepEqual(requests[1].body.arguments, { kind: 'merchant-exchange', sku: 'treasure_map', quantity: 3, expectedUnitPrice: 10, expectedPeriodKey: '2026-10-26' });
  assert.ok(requests.every(request => !request.path.endsWith('/treasures.confirm')));
});

test('月礼盒预览携带本月周期和服务端价格，不按周重置或替换成碎片', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('/treasures.merchant') ? merchant() : { ...preview, summary: ['兑换神话礼盒1个，消耗1000仙蕴。'] }));
  const command = '/上古遗珍 兑换 mythic_box 1';
  const view = delivered(await app.runHandler(handler, app.events.groupMessage({ text: command, platform: 'qq-bot' })), command);

  assert.match(view.text, /神话礼盒1个/);
  assert.match(view.text, /消耗1000仙蕴/);
  assert.deepEqual(requests[1].body.arguments, { kind: 'merchant-exchange', sku: 'mythic_box', quantity: 1, expectedUnitPrice: 1000, expectedPeriodKey: '2026-10-01' });
});

test('确认兑换后自动展示新价商店，重复确认沿原引用查询不生成另一笔预览', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('/treasures.merchant') ? merchant(15) : { kind: 'merchant-exchange', operationId, result: { operationId, message: '兑换藏宝图10张，消耗100仙蕴。' } }));
  const command = `/确认宝物 ${confirmationRef}`;

  for (let i = 0; i < 2; i++) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    const view = delivered(result, command, 2);

    assert.match(inspectMessage(result.messages[0].nodes).text, /兑换藏宝图10张/);
    assert.match(view.text, /价格：15仙蕴/);
    assert.doesNotMatch(view.text, /价格：10仙蕴/);
  }
  assert.equal(requests.length, 4);
  const confirmations = requests.filter(request => request.path.endsWith('/treasures.confirm'));

  assert.equal(confirmations.length, 2);
  assert.ok(confirmations.every(request => request.body.arguments && (request.body.arguments as Record<string, unknown>).confirmationRef === confirmationRef));
  assert.ok(requests.every(request => !request.path.endsWith('/treasures.preview')));
});

for (const args of ['treasure_map 0', 'treasure_map -1', 'treasure_map 1.5', 'treasure_map 9007199254740992', 'unknown 1', 'treasure_map 1 extra']) {
  test(`无效兑换参数不请求后端：${args}`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('must not request'); });
    const command = `/上古遗珍 兑换 ${args}`;
    const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

    assert.match(view.text, /参数错误/);
    assert.equal(requests.length, 0);
  });
}

test('藏宝图数量超过当前档只显示商店，不预览跨档价格或自动补足', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, merchant()));
  const command = '/上古遗珍 兑换 treasure_map 11';
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

  assert.match(view.text, /超过当前商品可兑换份数/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/treasures.merchant');
});

test('售罄商品保留价格和剩余数量，移除兑换按钮', async t => {
  const data = merchant();
  const item = data.products.find(product => product.sku === 'mythic_box')!;

  Object.assign(item, { purchased: 1, remaining: 0, maxQuantity: 0, available: false, unavailableReason: '本月限购已用完' });
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const command = '/上古遗珍 秘宝商人';
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

  assert.match(view.text, /月限购1 · 剩余0/);
  assert.match(view.text, /本月限购已用完/);
  assert.ok(!view.commands.includes('/上古遗珍 兑换 mythic_box 1'));
});

test('商店解析拒绝重复藏宝图和不安全价格，支持最终不限购档', () => {
  assert.equal(parseTreasureMerchant(merchant()).rulesVersion, 'treasure-merchant-v2-box-prices-20261031');
  assert.equal(parseTreasureMerchant({ ...merchant(), rulesVersion: 'treasure-merchant-v1-20261031' }).rulesVersion, 'treasure-merchant-v1-20261031');
  assert.throws(() => parseTreasureMerchant({ ...merchant(), rulesVersion: 'unknown-merchant-version' }));
  const duplicate = merchant();

  duplicate.products.push(duplicate.products[0]);
  assert.throws(() => parseTreasureMerchant(duplicate));
  const unsafe = merchant();

  unsafe.products[0].unitPrice = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => parseTreasureMerchant(unsafe));
  const unlimited = merchant(50);

  Object.assign(unlimited.products[0], { limit: null, remaining: null, maxQuantity: 1000, nextUnitPrice: undefined, tier: 6 });
  const result = parseTreasureMerchant(unlimited);

  assert.equal(result.products[0].remaining, null);
  assert.equal(result.products[0].maxQuantity, 1000);
});
