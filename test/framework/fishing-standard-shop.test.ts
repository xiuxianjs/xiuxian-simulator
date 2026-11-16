import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import type { CompanionShopQueryData } from '../../src/api/schemas/companion-shop-query';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

test('渔市走标准商店目录，批量和大额确认走标准购买指令', async t => {
  const reference = 'r1_1_s_mh9of000_0123456789abcdef01234567';
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/shops.list')) {
      assert.deepEqual(request.body.arguments, { page: 1, shopCode: 'FISHING', filters: { category: 'prop', subtype: 'fishing_bait' } });
      const item = {
        shopCode: 'FISHING', productId: 501, name: '定鳞饵', category: 'item', itemId: 5001,
        priceAmount: 150, priceCurrencyCode: 'SPIRIT_STONE', priceCurrencyName: '灵石',
        secondaryPriceAmount: null, secondaryPriceCurrencyCode: null, secondaryPriceCurrencyName: null,
        grantCurrencyCode: null, grantCurrencyName: null, quantity: 1, used: 0, remaining: 100,
        limit: 100, limitPeriod: 'daily', limitPeriodName: '每日', typeLabel: '鱼饵',
        requiredRealmId: null, requiredStars: null, discountPriceAmount: null, discountRate: null, discountLabel: null,
        itemType: 'prop', itemSubtype: 'fishing_bait', requiredRealmName: null, lockReason: null, unlocked: true, nextPurchaseAt: null
      };
      return businessEnvelope(request.bid, {
        access: { hasCompanion: true, isFoundationRealm: true, canUseReputationShop: true, visibleShopCodes: ['WANBAOLOU', 'FISHING'], deniedReason: null },
        currencies: { spiritStone: 10000, spiritsCrystal: 10000, spiritsMilk: 1, signInCoin: 25, towerScore: 2570, reputation: 80, tongxin: 608, greenBottle: 42, fishingCoin: 44300 },
        products: [item], page: 1, totalPages: 1, total: 1
      });
    }
    assert.ok(request.path.endsWith('/shops.purchase'));
    const args = request.body.arguments as { mode?: string; productId?: number; count?: number };
    if (args.mode === 'reference') {
      return businessEnvelope(request.bid, { reference, result: { name: '捕灵网', paid: '4000 SPIRIT_CRYSTAL', granted: 2, buyCount: 2 } });
    }
    const count = args.count ?? 1;
    const bait = args.productId === 501;
    const preview = { productId: args.productId, shopCode: 'FISHING', name: bait ? '定鳞饵' : '捕灵网',
      paid: bait ? `${150 * count} SPIRIT_STONE` : '4000 SPIRIT_CRYSTAL', granted: count, buyCount: count, needsConfirmation: !bait };
    return businessEnvelope(request.bid, { preview, result: bait ? preview : null, ...(!bait ? { reference } : {}) });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async (text: string) => {
    const outcome = await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(outcome.errors, []);
    assert.equal(outcome.messages.length, 1);
    const [message] = outcome.messages;
    assert.equal(outcome.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return inspectMessage(message.nodes);
  };
  const page = await send('/商店 渔市 饵料');
  assert.ok(page.commands.includes('/购买 501'));
  assert.match(page.text, /‹购买›[^\n]*‹详情›/);
  assert.doesNotMatch(page.text, /‹买\d+份›/);
  assert.match(page.text, /\| 同心值 \| 小绿瓶 \| 灵鳞钱 \|\n\| 608 \| 42 \| 4\.43万 \|/);
  assert.doesNotMatch(page.text, /灵鳞钱：/);
  const receipt = await send('/购买 501 20');
  assert.match(receipt.text, /获得×20/);
  assert.deepEqual(requests[1].body.arguments, { productId: 501, count: 20, confirmed: false });
  const confirm = await send('/购买 502 2');
  const command = `/购买 确认 ${reference}`;
  assert.ok(confirm.commands.includes(command));
  assert.ok([...command].length <= 80);
  assert.match((await send(command)).text, /获得×2/);
  assert.deepEqual(requests[3].body.arguments, { mode: 'reference', reference });
});

test('渔市升灵散按发放物品合并，购买仍使用各币种商品编号', async t => {
  const crystal: CompanionShopQueryData['products'][number] = {
    shopCode: 'FISHING', productId: 598, name: '升灵散', category: 'item', itemId: 5032,
    priceAmount: 1600, priceCurrencyCode: 'SPIRIT_CRYSTAL', priceCurrencyName: '灵晶',
    secondaryPriceAmount: null, secondaryPriceCurrencyCode: null, secondaryPriceCurrencyName: null,
    grantCurrencyCode: null, grantCurrencyName: null, quantity: 1, used: 1, remaining: 0,
    limit: 1, limitPeriod: 'daily', limitPeriodName: '每日', typeLabel: '物品',
    requiredRealmId: null, requiredStars: null, discountPriceAmount: 1472, discountRate: 0.92, discountLabel: '9.2折',
    itemType: 'prop', itemSubtype: 'fishing_chum', requiredRealmName: null, lockReason: null, unlocked: true, nextPurchaseAt: null
  };
  const coin: typeof crystal = {
    ...crystal, productId: 597, priceAmount: 8000, priceCurrencyCode: 'FISHING_COIN', priceCurrencyName: '灵鳞钱',
    used: 0, remaining: 3, limit: 3, limitPeriod: 'weekly', limitPeriodName: '每周', discountPriceAmount: 7360
  };
  const milk: typeof crystal = {
    ...crystal, productId: 599, priceAmount: 40, priceCurrencyCode: 'SPIRIT_MILK', priceCurrencyName: '道晶',
    used: 0, remaining: -1, limit: -1, limitPeriod: 'unlimited', limitPeriodName: '不限购', discountPriceAmount: 36
  };
  const other: typeof crystal = {
    ...crystal, shopCode: 'WANBAOLOU', productId: 11, itemId: 88, name: '清心丹', typeLabel: '丹药',
    priceAmount: 100, priceCurrencyCode: 'REPUTATION', priceCurrencyName: '声望', used: 0, remaining: 1,
    discountPriceAmount: 92, discountLabel: 'VIP9.2折', itemSubtype: 'pill'
  };
  const { app, requests } = await gameFixture(t, request => {
    assert.ok(request.path.endsWith('/shops.list'));
    const fishing = (request.body.arguments as { shopCode: string }).shopCode === 'FISHING';

    return businessEnvelope(request.bid, {
      access: { hasCompanion: true, isFoundationRealm: true, canUseReputationShop: true, visibleShopCodes: ['WANBAOLOU', 'FISHING'], deniedReason: null },
      currencies: { spiritStone: 10000, spiritsCrystal: 10000, spiritsMilk: 100, signInCoin: 25, towerScore: 20, reputation: 800, tongxin: 60, greenBottle: 4, fishingCoin: 44300 },
      products: fishing ? [coin, crystal, milk] : [other], page: 1, totalPages: 1, total: 1
    });
  }, 200, {}, 15_000);
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const render = async (text: string) => {
    const sent = await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' }));

    assert.deepEqual(sent.errors, []);
    assert.equal(sent.messages.length, 1);
    const [message] = sent.messages;

    assert.equal(sent.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return { ...inspectMessage(message.nodes), nodes: message.nodes };
  };
  const fishing = await render('/商店 渔市 窝料');
  const standard = await render('/商店 万宝楼');

  if (process.env.FISH_SHOP_OFFER_CAPTURE_OUTPUT) {
    writeFileSync(process.env.FISH_SHOP_OFFER_CAPTURE_OUTPUT, JSON.stringify({ captures: { fishing, standard } }, null, 2));
  }
  const assertCard = (page: typeof fishing, expectedTitle: string) => {
    const markdown = page.nodes.find(node => node.type === 'Markdown');

    assert.ok(markdown?.type === 'Markdown');
    const quotes = markdown.value.filter(node => node.type === 'MD.blockquote');

    assert.equal(quotes.length, 1);
    const [quote] = quotes;

    assert.deepEqual(quote.value.filter(node => node.type === 'MD.bold').map(node => node.value), [expectedTitle]);
    const buttons = quote.value.filter(node => node.type === 'MD.button');

    assert.ok(buttons.every(node => node.options?.autoEnter === false && !Object.hasOwn(node.options, 'show')));
    return buttons.map(node => node.options?.data);
  };

  assert.deepEqual(assertCard(fishing, '【597】【物品】升灵散 ×1'), [
    '/购买 597', '/物品详情 物品 5032', '/物品详情 物品 5032', '/购买 599', '/物品详情 物品 5032'
  ]);
  assert.match(fishing.text, /1472 灵晶（原价1600，9\.2折）  每日限1份 · 剩余0份\n> 今日已兑完.*‹详情›/);
  assert.match(fishing.text, /7360 灵鳞钱（原价8000，9\.2折）  每周限3份 · 剩余3份[^\n]*‹购买›[^\n]*‹详情›/);
  assert.match(fishing.text, /36 道晶（原价40，9\.2折）  不限购[^\n]*‹购买›[^\n]*‹详情›/);
  assert.match(fishing.text, /7360 灵鳞钱[\s\S]*1472 灵晶[\s\S]*36 道晶/);
  assert.deepEqual(assertCard(standard, '【11】【丹药】清心丹 ×1'), ['/购买 11', '/物品详情 物品 88']);
  assert.match(standard.text, /92 声望（原价100，VIP9\.2折）/);
  assert.deepEqual(requests[0].body.arguments, { page: 1, shopCode: 'FISHING', filters: { category: 'prop', subtype: 'fishing_chum' } });
});
