import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/shop/hub/res';
import { buildShopBrowseCommand, parseShopBrowseCommand } from '../../src/response/shop/filters';
import { catalogRequestFromMessage } from '../../src/api/bot/catalog-query-reuse';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const product = {
  productId: 301, shopCode: 'WANBAOLOU', name: '培元丹', category: 'item', itemId: 38,
  priceCurrencyCode: 'SPIRIT_STONE', priceCurrencyName: '灵石', priceAmount: 100,
  quantity: 1, used: 0, limit: 6, remaining: 6, limitPeriod: 'daily', limitPeriodName: '每日',
  typeLabel: '丹药', itemType: 'prop', itemSubtype: 'pill', unlocked: true,
  secondaryPriceAmount: null, secondaryPriceCurrencyCode: null, secondaryPriceCurrencyName: null,
  grantCurrencyCode: null, grantCurrencyName: null, requiredRealmId: null, requiredRealmName: null,
  requiredStars: null, lockReason: null, nextPurchaseAt: null, discountPriceAmount: null, discountLabel: null, discountRate: null
};
const shop = (page = 1, empty = false) => ({
  access: { hasCompanion: false, isFoundationRealm: false, canUseReputationShop: false, visibleShopCodes: ['WANBAOLOU', 'CHECKIN'], deniedReason: null },
  currencies: { spiritStone: 1000, spiritsCrystal: 5, spiritsMilk: 0, signInCoin: 0, towerScore: 0, reputation: 0, tongxin: 0, greenBottle: 0 },
  products: empty ? [] : [product], page, totalPages: empty ? 1 : 2, total: empty ? 0 : 6
});

for (const privateChat of [true, false]) {
  test(`万宝楼真实气泡提供组合筛选，下一页保留条件（${privateChat ? '私聊' : '群聊'}）`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, shop(Number((r.body.arguments as Record<string, unknown>).page))));
    const command = '/商店 万宝楼 灵石 筛选 道具 丹药 可购 价格升序 搜索 培元丹 1';
    const event = privateChat ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.deepEqual(requests[0].body.arguments, { page: 1, shopCode: 'WANBAOLOU', currencyCode: 'SPIRIT_STONE', filters: { category: 'prop', subtype: 'pill', keyword: '培元丹', availableOnly: true, sort: 'price_asc' } });
    const view = inspectMessage(message.nodes);
    assert.match(view.text, /培元丹/);
    assert.match(view.text, /第1\/2页/);
    assert.ok(view.commands.includes('/购买 301'));
    assert.ok(view.commands.includes('/物品详情 物品 38'));
    const pageCommand = command.replace(/ 1$/, ' 2');
    assert.ok(view.commands.includes(pageCommand));
    const material = view.commands.find(c => c.includes('筛选 材料 ')); assert.ok(material);
    assert.equal(parseShopBrowseCommand(material).secondaryLabel, undefined);
    assert.ok(!material.includes('丹药'));
    const next = await app.runHandler(handler, privateChat ? app.events.privateMessage({ text: pageCommand, platform: 'qq-bot' }) : app.events.groupMessage({ text: pageCommand, platform: 'qq-bot' }));
    assert.equal(next.messages.length, 1);
    assert.equal(next.actions[next.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[1].body.arguments, { ...(requests[0].body.arguments as object), page: 2 });
  });
}

test('空结果和缺参页保留搜索与七个分类按钮', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, shop(1, true)));
  for (const command of ['/商店 万宝楼 筛选 材料 草药 1', '/商店 万宝楼 搜索']) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.match(view.text, command.endsWith('搜索') ? /请输入商品名称/ : /没有符合条件的商品/);
    const categoryButtons = message.nodes.flatMap(n => n.type === 'Markdown' ? n.value : [])
      .flatMap(n => n.type === 'MD.button' && /^‹(?:▸)?(?:全部|道具|材料|装备|天工|功法|本命)›$/.test(n.value) ? [n.value] : []);
    const selected = command.endsWith('搜索') ? '全部' : '材料';
    assert.deepEqual(categoryButtons, ['全部', '道具', '材料', '装备', '天工', '功法', '本命'].map(label => `‹${label === selected ? '▸' : ''}${label}›`));
    assert.ok(view.commands.some(command => command.endsWith(' 搜索 ')));
    assert.doesNotMatch(view.text, /‹兑换›|‹重置›|‹全币种›|‹仅看可购›|‹默认排序›|‹草药›|‹价格[↑↓]›/);
  }
  assert.equal(requests.length, 2);
});

test('关键词不误识别币种或页码，组合命令往返一致且不复用未筛选目录', () => {
  const selection = parseShopBrowseCommand('/商店 万宝楼 灵石 筛选 材料 经验材料 价格降序 搜索 灵晶 100 3');
  assert.equal(selection.page, 3); assert.equal(selection.currencyCode, 'SPIRIT_STONE');
  assert.equal(selection.filters.keyword, '灵晶 100'); assert.equal(selection.filters.subtype, 'exp');
  assert.deepEqual(parseShopBrowseCommand(buildShopBrowseCommand(selection, {}, 3)), selection);
  assert.equal(catalogRequestFromMessage(buildShopBrowseCommand(selection), 'shop'), undefined);
  assert.ok(catalogRequestFromMessage('/商店 万宝楼 灵石 2', 'shop'));
  assert.equal(parseShopBrowseCommand('/商店 万宝楼 价格升序').error, '请先选择币种，再按价格排序');
  assert.equal(parseShopBrowseCommand('/商店 万宝楼 搜索 100').filters.keyword, '100');
});

test('点击搜索保留当前分类，搜索结果切换分类和翻页均保留关键词', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, shop(Number((r.body.arguments as Record<string, unknown>).page))));
  const render = async (text: string) => {
    const result = await app.runHandler(handler, app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return message;
  };
  const initial = await render('/商店 万宝楼 筛选 道具 1');
  const search = initial.nodes.flatMap(n => n.type === 'Markdown' ? n.value : []).find(n => n.type === 'MD.button' && n.value === '‹搜索›');
  assert.ok(search?.type === 'MD.button' && search.options?.data);
  assert.equal(search.options.autoEnter, false);
  assert.equal(search.options.data, '/商店 万宝楼 筛选 道具 搜索 ');
  const found = await render(`${search.options.data}培元丹`);
  assert.deepEqual(requests.at(-1)?.body.arguments, { page: 1, shopCode: 'WANBAOLOU', filters: { category: 'prop', keyword: '培元丹' } });
  const controls = found.nodes.flatMap(n => n.type === 'Markdown' ? n.value : []);
  const labels = controls.flatMap(n => n.type === 'MD.button' && /^‹(?:搜索|▸?(?:全部|道具|材料|装备|天工|功法|本命))›$/.test(n.value) ? [n.value] : []);
  assert.deepEqual(labels.slice(0, 8), ['‹搜索›', '‹全部›', '‹▸道具›', '‹材料›', '‹装备›', '‹天工›', '‹功法›', '‹本命›']);
  const nextPage = inspectMessage(found.nodes).commands.find(c => c === '/商店 万宝楼 筛选 道具 搜索 培元丹 2');
  assert.ok(nextPage);
  await render(nextPage);
  assert.deepEqual(requests.at(-1)?.body.arguments, { page: 2, shopCode: 'WANBAOLOU', filters: { category: 'prop', keyword: '培元丹' } });
  const material = controls.find(n => n.type === 'MD.button' && n.value === '‹材料›');
  assert.ok(material?.type === 'MD.button' && material.options?.data);
  await render(material.options.data);
  assert.deepEqual(requests.at(-1)?.body.arguments, { page: 1, shopCode: 'WANBAOLOU', filters: { category: 'material', keyword: '培元丹' } });
});

test('其他货币商店保留原请求，物品分类使用当前商店', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, shop()));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/商店 签到 1', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.deepEqual(requests[0].body.arguments, { page: 1, shopCode: 'CHECKIN' });
  const view = inspectMessage(result.messages[0].nodes);
  assert.ok(view.commands.includes('/商店 签到 2'));
  assert.ok(view.commands.includes('/商店 签到 筛选 道具 1'));
  assert.ok(!view.commands.some(c => c.startsWith('/商店 万宝楼 筛选 ')));
});

test('header 货币商店、footer 物品分类独立组合，切换和搜索不串店', async t => {
  const visibleShopCodes = ['WANBAOLOU', 'CHECKIN', 'TOWER_SCORE', 'DAOLV', 'SHENQI', 'REPUTATION'];
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { ...shop(), access: { ...shop().access, visibleShopCodes } }));
  const render = async (text: string) => {
    const result = await app.runHandler(handler, app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return message;
  };
  for (const [label, code] of [['', undefined], ['万宝楼', 'WANBAOLOU'], ['签到', 'CHECKIN'], ['积分', 'TOWER_SCORE'], ['道侣', 'DAOLV'], ['神奇', 'SHENQI'], ['声望', 'REPUTATION']]) {
    const text = `/商店${label ? ` ${label}` : ''} 筛选 道具 搜索 培元丹 1`;
    const message = await render(text);
    assert.deepEqual(requests.at(-1)?.body.arguments, { page: 1, ...(code ? { shopCode: code } : {}), filters: { category: 'prop', keyword: '培元丹' } });
    const nodes = message.nodes.flatMap(n => n.type === 'Markdown' ? n.value : []);
    const firstQuote = nodes.findIndex(n => n.type === 'MD.blockquote');
    const lastQuote = nodes.findLastIndex(n => n.type === 'MD.blockquote');
    const firstCurrency = nodes.findIndex(n => n.type === 'MD.button' && n.value === `‹${code === 'WANBAOLOU' ? '▸' : ''}万宝楼›`);
    const firstCategory = nodes.findIndex(n => n.type === 'MD.button' && n.value === '‹全部›');
    assert.ok(firstCurrency >= 0 && firstCurrency < firstQuote);
    assert.ok(firstCategory > lastQuote);
    const categories = nodes.filter(n => n.type === 'MD.button' && /^‹(?:▸)?(?:全部|道具|材料|装备|天工|功法|本命)›$/.test(n.value));
    assert.equal(categories.length, 7);
    assert.deepEqual(categories.flatMap(n => n.type === 'MD.button' && n.value.startsWith('‹▸') ? [n.value] : []), ['‹▸道具›']);
    const material = nodes.find(n => n.type === 'MD.button' && n.value === '‹材料›');
    assert.ok(material?.type === 'MD.button' && material.options?.data);
    const selected = parseShopBrowseCommand(material.options.data);
    assert.equal(selected.shopCode, code); assert.equal(selected.filters.category, 'material'); assert.equal(selected.filters.keyword, '培元丹');
    const currency = nodes.find(n => n.type === 'MD.button' && n.value === `‹${code === 'CHECKIN' ? '▸' : ''}签到›`);
    assert.ok(currency?.type === 'MD.button' && currency.options?.data);
    const switched = parseShopBrowseCommand(currency.options.data);
    assert.equal(switched.shopCode, 'CHECKIN'); assert.equal(switched.filters.category, 'prop'); assert.equal(switched.filters.keyword, '培元丹');
  }
});
