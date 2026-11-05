import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/market/list/res';
import myListings from '../../src/response/market/my/res';
import { createMarketCommandBar, parseMarketCommand } from '../../src/response/market/command';
import type { MarketBrowseItem } from '../../src/api/schemas/market-browse-query';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const controlRows = [
  ['我的上架', '记录', '搜索'],
  ['全部', '道具', '材料', '装备', '天工', '功法', '本命', '鱼类'],
  ['价格升序', '价格降序'],
  ['品级升序', '品级降序']
];
const browse = (page = 1, items: MarketBrowseItem[] = []) => ({
  view: 'browse', spiritsCrystal: 500, quota: { dailyLimit: 10, dailyUsed: 0, remaining: 10 },
  items, pagination: { currentPage: page, totalPages: items.length ? 2 : 1, total: items.length ? 6 : 0 }
});
const item: MarketBrowseItem = {
  listingId: 302, sellerUserId: 2, sellerName: '清霜', itemCategory: 'item', itemCategoryLabel: '丹药',
  itemType: 'prop', itemSubtype: 'pill', templateItemId: 38, itemName: '培元丹', quantity: 1,
  unitPriceAmount: 200, currencyCode: 'SPIRIT_CRYSTAL', currencyName: '灵晶', canPurchase: true,
  purchaseUnavailableReason: null, upgradeHint: '', attributeAvailable: false, attributes: null, attributeView: null,
  createdAt: '2026-10-22T09:00:00+08:00', expiresAt: null
};

for (const privateChat of [true, false]) {
  test(`普通、分类和搜索默认按最新查询，气泡只保留四行控件（${privateChat ? '私聊' : '群聊'}）`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, browse()));
    for (const command of ['/珍宝楼', '/珍宝楼 筛选 装备', '/珍宝楼 搜索 培元丹', '/珍宝楼 筛选 道具 丹药']) {
      const event = privateChat ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
      const result = await app.runHandler(handler, event);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      assert.equal((requests.at(-1)?.body.arguments as Record<string, unknown>).sort, 'latest');
      const buttons = message.nodes.flatMap(n => n.type === 'Markdown' ? n.value : []).flatMap(n => n.type === 'MD.button' ? [n.value] : []);
      const parsed = parseMarketCommand(command); assert.ok(parsed);
      assert.deepEqual(buttons, controlRows.flat().map(label => `‹${label === (parsed.primaryCategoryCN ?? '全部') ? '▸' : ''}${label}›`));
      assert.deepEqual(createMarketCommandBar(parsed).map(row => row.map(button => button.label)), controlRows);
      for (const button of createMarketCommandBar(parsed)[1]) {
        const category = parseMarketCommand(button.command ?? ''); assert.ok(category);
        assert.equal(category.sort, 'latest'); assert.equal(category.page, 1);
        assert.equal(category.secondaryCategoryCN, undefined);
      }
    }
    assert.equal(requests.length, 4);
  });
}

test('主动排序保留分类或关键词，翻页保留排序，切换分类重置为最新', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, browse(Number((r.body.arguments as Record<string, unknown>).page), [item])));
  const render = async (text: string) => {
    const result = await app.runHandler(handler, app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    return result.messages[0];
  };
  for (const initial of ['/珍宝楼 筛选 道具 丹药', '/珍宝楼 搜索 培元丹']) {
    const first = await render(initial);
    const controls = first.nodes.flatMap(n => n.type === 'Markdown' ? n.value : []);
    const sort = controls.find(n => n.type === 'MD.button' && n.value === '‹价格降序›');
    assert.ok(sort?.type === 'MD.button' && sort.options?.data);
    const sorted = await render(sort.options.data);
    const args = requests.at(-1)?.body.arguments as Record<string, unknown>;
    assert.equal(args.sort, 'price_desc');
    if (initial.includes('搜索')) assert.equal(args.keyword, '培元丹');
    else { assert.equal(args.categoryType, 'prop'); assert.equal(args.categorySubtype, 'pill'); }
    const pageCommand = inspectMessage(sorted.nodes).commands.find(c => c.endsWith('价格降序 2')); assert.ok(pageCommand);
    await render(pageCommand);
    assert.deepEqual(requests.at(-1)?.body.arguments, { ...args, page: '2' });
    const material = sorted.nodes.flatMap(n => n.type === 'Markdown' ? n.value : []).find(n => n.type === 'MD.button' && n.value === '‹材料›');
    assert.ok(material?.type === 'MD.button' && material.options?.data);
    await render(material.options.data);
    assert.deepEqual(requests.at(-1)?.body.arguments, { view: 'browse', categoryType: 'material', categorySubtype: '', keyword: '', sort: 'latest', page: '1' });
  }
});

test('最新结果保持服务端顺序，不在气泡中按低价重新排列', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, browse(1, [item, { ...item, listingId: 301, unitPriceAmount: 10, createdAt: '2026-10-21T09:00:00+08:00' }])));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/珍宝楼 筛选 道具', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.equal((requests[0].body.arguments as Record<string, unknown>).sort, 'latest');
  const view = inspectMessage(result.messages[0].nodes);
  assert.ok(view.text.indexOf('【302】') < view.text.indexOf('【301】'));
});

test('公开和我的挂单共用普通物品行，鱼仍保留精确克重及手动操作', async t => {
  const fish: MarketBrowseItem = {
    ...item, listingId: 801, itemCategory: 'fish', itemCategoryLabel: '鱼类', itemType: null, itemSubtype: null, templateItemId: null,
    itemName: '金须鲤', catchId: 'ff_' + 'a'.repeat(32), weightG: 1840, unitPriceAmount: 500,
    expiresAt: '2026-10-23T09:00:00+08:00'
  };
  const unavailable = { ...fish, listingId: 802, itemName: '青背鲫', catchId: 'ff_' + 'b'.repeat(32), weightG: 178, canPurchase: false,
    purchaseUnavailableReason: '商品仍在公示期' };
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/market.browse')) {
      return businessEnvelope(request.bid, browse(1, [item, fish, unavailable]));
    }
    assert.ok(request.path.endsWith('/market.my-listings'));

    return businessEnvelope(request.bid, {
      items: [item, fish].map(row => ({ ...row, totalPriceAmount: row.unitPriceAmount * row.quantity, lockTag: '', lockedUntil: null, status: 1 })),
      pagination: { currentPage: 1, totalPages: 2, total: 6 }
    });
  });
  const render = async (response: typeof handler, text: string) => {
    const result = await app.runHandler(response, app.events.privateMessage({ text, platform: 'qq-bot' }));

    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];

    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);

    return { ...inspectMessage(message.nodes), nodes: message.nodes };
  };
  const publicPage = await render(handler, '/珍宝楼');
  const myPage = await render(myListings, '/我的上架');

  if (process.env.FISH_MARKET_LIST_CAPTURE_OUTPUT) {
    writeFileSync(process.env.FISH_MARKET_LIST_CAPTURE_OUTPUT, JSON.stringify({
      source: 'QQ真实处理器发送节点；隔离市场响应夹具，未投递真实平台。', captures: { browse: publicPage, my: myPage }
    }, null, 2));
  }
  const assertRow = (page: typeof publicPage, expected: string[], action: string) => {
    const markdown = page.nodes.find(node => node.type === 'Markdown');

    assert.ok(markdown?.type === 'Markdown');
    const quote = markdown.value.find(node => node.type === 'MD.blockquote' && Array.isArray(node.value) &&
      node.value.some(part => part.type === 'MD.text' && part.value === expected[0]));

    assert.ok(quote?.type === 'MD.blockquote' && Array.isArray(quote.value), page.text);
    assert.deepEqual(quote.value.filter(node => node.type === 'MD.text').map(node => node.value).filter(line => line.trim()), expected);
    const button = quote.value.find(node => node.type === 'MD.button');

    assert.equal(button?.options?.data, action);
    assert.equal(button?.options?.autoEnter, false);
    assert.ok(!Object.hasOwn(button?.options ?? {}, 'show'));
    assert.ok([...action].length <= 80);
  };

  assertRow(publicPage, ['【801】【鱼类】 金须鲤×1', '重量：1.840 kg', '单价：500 灵晶  卖家：清霜'], '/选购 801 1');
  assertRow(myPage, ['【801】【鱼类】 金须鲤 ×1', '重量：1.840 kg', '单价：500 灵晶  总价：500 灵晶', '时间：2026-10-23 09:00:00'], '/交易下架 801');
  assert.match(publicPage.text, /【302】【丹药】 培元丹×1/);
  assert.match(myPage.text, /【302】【丹药】 培元丹 ×1/);
  assert.ok(publicPage.commands.includes('/选购 302'));
  assert.ok(publicPage.commands.includes('/珍宝楼 2'));
  assert.ok(myPage.commands.includes('/交易下架 302'));
  assert.ok(myPage.commands.includes('/我的上架 2'));
  assert.ok(!publicPage.commands.some(command => command.startsWith('/选购 802')));
  assert.deepEqual(requests.map(request => request.body.arguments), [
    { view: 'browse', categoryType: '', categorySubtype: '', keyword: '', sort: 'latest', page: '1' }, { page: 1 }
  ]);
});

test('搜索缺参和旧筛选指令提示页也保留同样四行按钮', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { view: 'guide', spiritsCrystal: 500 }));
  for (const command of ['/珍宝楼 搜索', '/珍宝楼 筛选']) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const buttons = result.messages[0].nodes.flatMap(n => n.type === 'Markdown' ? n.value : []).flatMap(n => n.type === 'MD.button' ? [n.value] : []);
    assert.deepEqual(buttons, controlRows.flat().map(label => `‹${label}›`));
    assert.equal((requests.at(-1)?.body.arguments as Record<string, unknown>).view, 'guide');
    assert.doesNotMatch(inspectMessage(result.messages[0].nodes).text, /示例|一级分类|二级分类/);
  }
});
