import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import handler from '../../src/response/market/sell/res';
import fishingHandler from '../../src/response/fishing/res';
import { parseFishingView } from '../../src/api/bot/fishing';
import { parseBackendMarketSellable } from '../../src/api/bot/market-trade';
import { parseFishingCommand } from '../../src/response/fishing/commands';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

const captures: Record<string, TestRunResult['messages']> = {};
after(() => {
  if (process.env.FISHING_MARKET_WIRE_CAPTURE) writeFileSync(process.env.FISHING_MARKET_WIRE_CAPTURE, JSON.stringify(captures, null, 2));
  return shutdownLogger();
});
const catchId = 'fc_0123456789abcdef0123456789abcdef';
const wire = JSON.parse(readFileSync(new URL('../fixtures/fishing-market-wire-actual.json', import.meta.url), 'utf8')).cases;
const marketPreview = wire['listing-preview'].data.data;
const reference = marketPreview.fishConfirmation.confirmationRef;
const range = { minPrice: 50, maxPrice: 114, referencePrice: 63, source: 'fish_weight_anchor', credibilityReady: true, templateItemId: 0, maxListingQuantity: 1, fixedQuantity: true };
const fish = { userItemId: 0, templateId: 0, catchId, weightG: 1840, category: 'fish', name: '金须鲤', quantity: 1, gradeId: null, grade: '', realm: '筑基', currentLowestPrice: null, priceRange: range };
const pickerCommand = '/交易上架 鱼类';
const speciesId = 'fishing_r2_b';
const pickerFooter = [{ label: '返回渔获', command: '/储物袋 渔获' }, { label: '我的上架', command: '/我的上架' }];
const pickerArgs = { mode: 'fish-picker', category: 'fish' };
type PickerArgs = { fishRealm?: number; speciesId?: string; page: string; returnPage?: string };

function pickerResponse(args: PickerArgs) {
  const realm = args.fishRealm === 2 ? '筑基' : '全部';
  const page = Number(args.page);
  const group = realm === '全部' ? pickerCommand : `${pickerCommand} ${realm}`;
  const base = { rulesVersion: 'market-picker-test', title: '交易上架 - 鱼类', status: realm, footer: pickerFooter };
  const instances = `${pickerCommand} 鱼种 ${speciesId}`;

  return { ...pickerArgs, view: args.speciesId ? {
    ...base, view: 'market-fish-instances',
    sections: [{ title: '金须鲤', id: catchId, lines: ['数量：1尾 · 境界：筑基', '重量：1.840 kg', '可挂区间：50~114 灵晶'],
      actions: [{ label: '上架', command: `${pickerCommand} ${catchId}` }] }],
    nav: { page, totalPages: 2, total: 7, command: `${instances} {page} ${args.returnPage} ${realm}` },
    footer: [{ label: '返回鱼种', command: `${group} ${args.returnPage}` }, ...pickerFooter]
  } : {
    ...base, view: 'market-fish-species',
    navRows: [[{ label: '全部', command: pickerCommand }, { label: '筑基', command: `${pickerCommand} 筑基` }, { label: '炼气', command: `${pickerCommand} 炼气` }]],
    sections: [{ title: '金须鲤', id: speciesId, lines: ['数量：7尾 · 境界：筑基'],
      actions: [{ label: '查看该种', command: `${instances} 1 ${page} ${realm}` }] }],
    nav: { page, totalPages: 2, total: 6, command: `${pickerCommand} ${realm} {page}` }
  } };
}
function delivered(result: TestRunResult) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const nodes = result.messages[0].nodes;
  const keyboard = nodes.filter(node => node.type === 'BT.group');
  assert.equal(nodes.at(-1)?.type, 'BT.group');
  assert.equal(keyboard.length, 1);
  const shortcuts = [['我', '/我'], ['战', '/属性面板'], ['本', '/查看主线'], ['动', '/我的活动'], ['店', '/商店']];
  assert.deepEqual(keyboard[0].value, [{ type: 'BT.row', value: shortcuts.map(([value, data]) => ({ type: 'Button', value, options: { data } })) }]);
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
  walk(nodes);
  return inspectMessage(nodes);
}

test('鱼类上架沿境界、鱼种和单尾翻页往返，保留筛选和原始编号', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, pickerResponse(request.body.arguments as PickerArgs)));
  await app.mount({ responseRouter: app.run(createGameRouter).router }, undefined, 'xiuxian-game');
  const run = async (text: string) => {
    const result = await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' }));

    return { messages: result.messages, view: delivered(result) };
  };
  const { view: all, messages } = await run(pickerCommand);
  captures['listing-list'] = messages;
  assert.match(all.text, /交易上架 - 鱼类/);
  assert.match(all.text, /‹▸全部›/);
  assert.match(all.text, /数量：7尾 · 境界：筑基/);
  assert.ok(all.text.indexOf('‹筑基›') < all.text.indexOf('金须鲤'));
  assert.ok(!all.text.includes(speciesId));
  const realmCommand = all.commands.find(command => command === `${pickerCommand} 筑基`)!;
  const { view: realm } = await run(realmCommand);
  assert.match(realm.text, /‹▸筑基›/);
  const pageCommand = realm.commands.find(command => command === `${pickerCommand} 筑基 2`)!;
  const { view: species } = await run(pageCommand);
  const speciesCommand = species.commands.find(command => command === `${pickerCommand} 鱼种 ${speciesId} 1 2 筑基`)!;
  const { view: instance, messages: instanceMessages } = await run(speciesCommand);
  captures['listing-instances'] = instanceMessages;
  assert.match(instance.text, /重量：1.840 kg/);
  assert.match(instance.text, /可挂区间：50~114 灵晶/);
  assert.ok(instance.text.includes(catchId));
  assert.ok(instance.commands.includes(`${pickerCommand} ${catchId}`));
  const secondInstanceCommand = instance.commands.find(command => command === `${pickerCommand} 鱼种 ${speciesId} 2 2 筑基`)!;
  const { view: secondInstance } = await run(secondInstanceCommand);
  await run(secondInstance.commands.find(command => command === pageCommand)!);
  await run(`${pickerCommand}2`);
  assert.deepEqual(requests.map(request => request.body.arguments), [
    { ...pickerArgs, page: '1' },
    { ...pickerArgs, page: '1', fishRealm: 2 },
    { ...pickerArgs, page: '2', fishRealm: 2 },
    { ...pickerArgs, page: '1', fishRealm: 2, speciesId, returnPage: '2' },
    { ...pickerArgs, page: '2', fishRealm: 2, speciesId, returnPage: '2' },
    { ...pickerArgs, page: '2', fishRealm: 2 },
    { ...pickerArgs, page: '2' }
  ]);
  assert.ok(requests.every(request => request.path.endsWith('/market.sell')));
});

// Service facts: NPC ceil per fish 21/14 coins, converted at 10 coins/crystal,
// then slot B 30x market anchor (A/B/C/D/E: 10/30/30/50/100). QQ renders server facts only.
for (const row of [
  { weightG: 1840, kg: '1.840', anchor: 63, minimum: 50, maximum: 114 },
  { weightG: 1200, kg: '1.200', anchor: 42, minimum: 33, maximum: 76 }
]) test(`新五档玩家市场报价保留原鱼编号及${row.weightG}克的服务端价格`, async t => {
  const quotedRange = { ...range, minPrice: row.minimum, maxPrice: row.maximum, referencePrice: row.anchor };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'start', range: quotedRange, catchId, weightG: row.weightG, itemName: '金须鲤' }));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: `/交易上架 鱼类 ${catchId}`, platform: 'qq-bot' }));
  const view = delivered(result);
  if (row.weightG === 1840) captures['listing-quote'] = result.messages;
  assert.ok(view.text.includes(catchId));
  assert.ok(view.text.includes(`重量：${row.kg} kg`));
  assert.ok(view.text.includes(`单价区间：${row.minimum}~${row.maximum} 灵晶（参考价 ${row.anchor} 灵晶）`));
  for (const price of [row.minimum, row.maximum, row.anchor]) assert.ok(view.commands.includes(`/交易上架 鱼类 ${catchId} ${price}`));
  assert.deepEqual(requests[0].body.arguments, { mode: 'start', category: 'fish', catchId, firstNumber: null, secondNumber: null });
});

test('已有 Go 鱼挂牌 z 原引用仍可取回原回执与重放', async t => {
  let confirmed = false;
  const { app, requests } = await gameFixture(t, request => {
    const args = request.body.arguments as Record<string, unknown>;
    assert.deepEqual(args, { mode: 'confirm', reference });
    const result = wire[confirmed ? 'listing-replay' : 'listing-confirm'].data;
    confirmed = true;
    return result;
  });
  const { catchId: originalFish } = marketPreview;
  const command = `/交易上架 鱼类 确认 ${reference}`;
  for (const messageId of ['fish-confirm-1', 'fish-confirm-1', 'fish-confirm-2']) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot', userId: 'player', messageId }));
    const receipt = delivered(result);
    assert.ok(receipt.text.includes('上架成功'));
    assert.match(receipt.text, /上架ID：\d+/);
    assert.match(receipt.text, /重量：1\.840 kg/);
    assert.ok(receipt.text.includes(originalFish));
    captures['listing-confirm'] = result.messages;
  }
  assert.equal(requests[0].idempotencyKey, requests[1].idempotencyKey);
  assert.ok(requests.every(request => request.path.endsWith('/market.sell')));
});

test('鱼类只查单尾报价，发送带价蓝链直接上架并使用原消息幂等键', async t => {
  const { catchId: originalFish } = marketPreview;
  const receipt = wire['listing-confirm'].data.data.fishConfirmation;
  const { app, requests } = await gameFixture(t, request => {
    const input = request.body.arguments as Record<string, unknown>;

    return businessEnvelope(request.bid, input.mode === 'start'
      ? { mode: 'start', range, catchId: originalFish, weightG: 1840, itemName: '金须鲤' }
      : { mode: 'receipt', receipt });
  });
  const quote = delivered(await app.runHandler(handler, app.events.privateMessage({ text: `${pickerCommand} ${originalFish}`, platform: 'qq-bot' })));
  assert.match(quote.text, /发送后直接上架/);
  const direct = quote.commands.find(command => command === `${pickerCommand} ${originalFish} 114`)!;
  for (const messageId of ['fish-direct-1', 'fish-direct-1']) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: direct, platform: 'qq-bot', messageId }));
    const view = delivered(result);

    captures['listing-direct'] = result.messages;
    assert.match(view.text, /上架成功/);
    assert.match(view.text, /重量：1\.840 kg/);
    assert.match(view.text, /单价：114 灵晶/);
    assert.ok(view.text.includes(originalFish));
    assert.ok(!view.commands.some(command => command.includes('确认')));
  }
  assert.deepEqual(requests.map(request => request.body.arguments), [
    { mode: 'start', category: 'fish', catchId: originalFish, firstNumber: null, secondNumber: null },
    { mode: 'direct', category: 'fish', catchId: originalFish, firstNumber: 114, secondNumber: null },
    { mode: 'direct', category: 'fish', catchId: originalFish, firstNumber: 114, secondNumber: null }
  ]);
  assert.equal(requests[1].idempotencyKey, requests[2].idempotencyKey);
});

test('直接上架回执未知时只提供核对入口，旧预览响应不生成确认按钮', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, marketPreview));
  const pricedCommand = `${pickerCommand} ${catchId} 114`;
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: pricedCommand, platform: 'qq-bot' })));

  assert.match(view.text, /交易上架 · 结果待核对/);
  assert.ok(view.commands.includes('/我的上架'));
  assert.ok(!view.commands.some(command => command === pricedCommand || command.includes('确认')));
  assert.deepEqual(requests.map(request => request.body.arguments), [
    { mode: 'direct', category: 'fish', catchId, firstNumber: 114, secondNumber: null }
  ]);
});

test('Go实际售鱼y预览与确认经QQ正常显示原回执', async t => {
  let confirmed = false;
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('fishing.preview')) return wire['sale-preview'].data;
    const result = wire[confirmed ? 'sale-replay' : 'sale-confirm'].data;
    confirmed = true;
    return result;
  });
  const saleId = 'ff_' + '2'.repeat(32);
  const previewResult = await app.runHandler(fishingHandler, app.events.privateMessage({ text: `/垂钓 售鱼 ${saleId}`, platform: 'qq-bot', userId: 'player' }));
  const preview = delivered(previewResult);
  const originalRef = wire['sale-preview'].data.data.confirmationRef;
  const command = `/垂钓 确认 ${originalRef}`;
  assert.ok(preview.commands.includes(command));
  for (const messageId of ['sale-wire-confirm-1', 'sale-wire-confirm-2']) {
    const result = await app.runHandler(fishingHandler, app.events.privateMessage({ text: command, platform: 'qq-bot', userId: 'player', messageId }));
    const receipt = delivered(result);
    assert.ok(receipt.text.includes('鱼获回收完成'));
    captures['sale-confirm'] = result.messages;
  }
  assert.ok(requests.slice(1).every(request => request.path.endsWith('/fishing.confirm')));
  assert.deepEqual(requests.slice(1).map(request => request.body.arguments), [{ ref: originalRef }, { ref: originalRef }]);
});

test('旧挂牌回执缺规则版本时仍核对原上架', async t => {
  const original = structuredClone(wire['listing-confirm'].data);
  original.data.fishConfirmation.rulesVersion = '';
  const { app, requests } = await gameFixture(t, () => original);
  const result = await app.runHandler(handler, app.events.privateMessage({ text: `/交易上架 鱼类 确认 ${reference}`, platform: 'qq-bot', userId: 'player' }));
  const receipt = delivered(result);
  assert.ok(receipt.text.includes('交易上架 · 结果待核对'));
  assert.ok(receipt.commands.includes('/我的上架'));
  assert.equal(requests.length, 1);
  captures['listing-before-missing-version'] = result.messages;
});

test('A档最低参考1晶的鱼报价只生成合法2晶动作，不生成越界参考价', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'start', range: { ...range, minPrice: 2, maxPrice: 2, referencePrice: 1 }, catchId, itemName: '凡鱼', weightG: 100 }));
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: `/交易上架 鱼类 ${catchId}`, platform: 'qq-bot' })));
  assert.ok(!view.text.includes('参考价 1 灵晶'));
  assert.ok(view.commands.includes(`/交易上架 鱼类 ${catchId} 2`));
  assert.ok(!view.commands.includes(`/交易上架 鱼类 ${catchId} 1`));
});

for (const command of [
  '/交易上架 鱼类 确认', `/交易上架 鱼类 确认 ${reference.slice(0, -1)}`,
  `/交易上架 鱼类 确认 ${reference.replace('_z_', '_y_')}`,
  `/交易上架 鱼类 ${catchId} 1 100`, `/交易上架 鱼类 ${catchId} -1`, `/交易上架 鱼类 ${catchId} 1.5`,
  `${pickerCommand} 筑基 0`, `${pickerCommand} 筑基 2147483648`, `${pickerCommand} 鱼种 bad 1 1`, `${pickerCommand} 鱼种 ${speciesId} 1 0 筑基`
]) test(`鱼挂单损坏/数量混淆零后端请求：${command}`, async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('invalid fish listing must not request'); });
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
  assert.match(view.text, /数量固定1/);
  assert.equal(requests.length, 0);
});

test('鱼挂牌z引用保持原玩家绑定，普通垂钓仍拒绝z', () => {
  const original = marketPreview.fishConfirmation;
  assert.equal(parseFishingView(original, 1, 'z').confirmationRef, reference);
  assert.throws(() => parseFishingView(original, 2, 'z'));
  assert.throws(() => parseFishingView(original, 1));
  const normal = parseFishingCommand(`/垂钓 确认 ${reference}`);
  assert.ok(normal && 'error' in normal);
});

test('鱼列表解析拒绝无编号/丢重量/叠堆或伪造物品grade', () => {
  const page = { items: [fish], total: 1, totalPages: 1, currentPage: 1, pageSize: 5 };
  assert.equal(parseBackendMarketSellable(page).items[0].catchId, catchId);
  for (const changed of [{ catchId: undefined }, { weightG: undefined }, { quantity: 2 }, { gradeId: 9 }]) assert.throws(() => parseBackendMarketSellable({ ...page, items: [{ ...fish, ...changed }] }));
});
