import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import handler from '../../src/response/market/sell/res';
import { parseBackendMarketSellable } from '../../src/api/bot/market-trade';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());
const catchId = 'fc_0123456789abcdef0123456789abcdef';
const reference = 'r1_1_y_mh9of000_0123456789abcdef01234567';
const range = { minPrice: 50, maxPrice: 114, referencePrice: 63, source: 'fish_weight_anchor', credibilityReady: true, templateItemId: 0, maxListingQuantity: 1, fixedQuantity: true };
const fish = { userItemId: 0, templateId: 0, catchId, weightG: 1840, category: 'fish', name: '金须鲤', quantity: 1, gradeId: null, grade: '', realm: '筑基', currentLowestPrice: null, priceRange: range };
const confirmation = (preview: boolean) => ({
  rulesVersion: 'fishing-v0.13', view: preview ? 'confirmation' : 'receipt', title: preview ? '鱼挂牌预览' : '鱼挂牌原回执',
  sections: [{ title: '金须鲤', id: catchId, lines: ['数量：1.840 kg', '上架价：63灵晶 · 手续费按原市场规则'], actions: [] }],
  footer: [{ label: '取消', command: '/交易上架 鱼类' }], operationId: 'fish-market-original',
  ...(preview ? { confirmationRef: reference, expiresAt: '2026-11-03T22:00:00Z' } : {})
});
function delivered(result: TestRunResult) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const walk = (nodes: unknown[]) => {
    for (const raw of nodes) {
      const node = raw as { type: string; value?: unknown; options?: Record<string, unknown> };
      if (node.type === 'MD.button') {
        assert.equal(node.options?.autoEnter, false);
        assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
        assert.ok([...String(node.options?.data)].length <= 80);
      }
      if (Array.isArray(node.value)) walk(node.value);
    }
  };
  walk(result.messages[0].nodes);
  return inspectMessage(result.messages[0].nodes);
}

test('原市场鱼类上架页逐尾保留字符串编号及精确克重', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'list', items: [fish], total: 1, totalPages: 1, currentPage: 1, pageSize: 5 }));
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/交易上架 鱼类', platform: 'qq-bot' })));
  assert.match(view.text, /1.840 kg/);
  assert.ok(view.commands.includes(`/交易上架 鱼类 ${catchId}`));
  assert.deepEqual(requests[0].body.arguments, { mode: 'list', category: 'fish', subtype: '', page: '1' });
});

// Service facts: NPC ceil per fish 21/14 coins, converted at 10 coins/crystal,
// then slot B 30x market anchor (A/B/C/D/E: 10/30/30/50/100). QQ renders server facts only.
for (const row of [
  { weightG: 1840, kg: '1.840', anchor: 63, minimum: 50, maximum: 114 },
  { weightG: 1200, kg: '1.200', anchor: 42, minimum: 33, maximum: 76 }
]) test(`新五档玩家市场报价保留原鱼编号及${row.weightG}克的服务端价格`, async t => {
  const quotedRange = { ...range, minPrice: row.minimum, maxPrice: row.maximum, referencePrice: row.anchor };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'start', range: quotedRange, catchId, weightG: row.weightG, itemName: '金须鲤' }));
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: `/交易上架 鱼类 ${catchId}`, platform: 'qq-bot' })));
  assert.ok(view.text.includes(catchId));
  assert.ok(view.text.includes(`${row.kg} kg`));
  assert.ok(view.text.includes(`整尾${row.minimum}～${row.maximum}灵晶`));
  assert.ok(view.text.includes(`参考${row.anchor}晶`));
  for (const price of [row.minimum, row.maximum, row.anchor]) assert.ok(view.commands.includes(`/交易上架 鱼类 ${catchId} ${price}`));
  assert.deepEqual(requests[0].body.arguments, { mode: 'start', category: 'fish', catchId, firstNumber: null, secondNumber: null });
});

test('鱼给价先冻结原预览，原market引用确认重放不走垂钓确认', async t => {
  const settled = new Set<string>();
  let listings = 0;
  const { app, requests } = await gameFixture(t, request => {
    const args = request.body.arguments as Record<string, unknown>;
    if (args.mode === 'start') return businessEnvelope(request.bid, { mode: 'start', range, catchId, weightG: 1840, itemName: '金须鲤', fishConfirmation: confirmation(true) });
    assert.deepEqual(args, { mode: 'confirm', reference });
    if (!settled.has(reference)) { settled.add(reference); listings++; }
    return businessEnvelope(request.bid, { mode: 'confirm', fishConfirmation: confirmation(false) });
  });
  const preview = delivered(await app.runHandler(handler, app.events.privateMessage({ text: `/交易上架 鱼类 ${catchId} 63`, platform: 'qq-bot' })));
  const command = `/交易上架 鱼类 确认 ${reference}`;
  assert.ok(preview.commands.includes(command));
  assert.ok(!preview.commands.some(command => command.startsWith('/垂钓 确认')));
  assert.deepEqual(requests[0].body.arguments, { mode: 'start', category: 'fish', catchId, firstNumber: 63, secondNumber: null });
  assert.equal(listings, 0);
  for (const messageId of ['fish-confirm-1', 'fish-confirm-1', 'fish-confirm-2']) delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot', messageId })));
  assert.equal(listings, 1);
  assert.equal(requests[1].idempotencyKey, requests[2].idempotencyKey);
  assert.ok(requests.every(request => request.path.endsWith('/market.sell')));
});

test('A档最低参考1晶的鱼报价只生成合法2晶动作，不生成越界参考价', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'start', range: { ...range, minPrice: 2, maxPrice: 2, referencePrice: 1 }, catchId, itemName: '凡鱼', weightG: 100 }));
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: `/交易上架 鱼类 ${catchId}`, platform: 'qq-bot' })));
  assert.ok(view.commands.includes(`/交易上架 鱼类 ${catchId} 2`));
  assert.ok(!view.commands.includes(`/交易上架 鱼类 ${catchId} 1`));
});

for (const command of [
  '/交易上架 鱼类 确认', `/交易上架 鱼类 确认 ${reference.slice(0, -1)}`,
  `/交易上架 鱼类 ${catchId} 1 100`, `/交易上架 鱼类 ${catchId} -1`, `/交易上架 鱼类 ${catchId} 1.5`
]) test(`鱼挂单损坏/数量混淆零后端请求：${command}`, async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('invalid fish listing must not request'); });
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
  assert.match(view.text, /数量固定1/);
  assert.equal(requests.length, 0);
});

test('鱼列表解析拒绝无编号/丢重量/叠堆或伪造物品grade', () => {
  const page = { items: [fish], total: 1, totalPages: 1, currentPage: 1, pageSize: 5 };
  assert.equal(parseBackendMarketSellable(page).items[0].catchId, catchId);
  for (const changed of [{ catchId: undefined }, { weightG: undefined }, { quantity: 2 }, { gradeId: 9 }]) assert.throws(() => parseBackendMarketSellable({ ...page, items: [{ ...fish, ...changed }] }));
});
