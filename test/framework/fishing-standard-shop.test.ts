import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
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
        currencies: { spiritStone: 10000, spiritsCrystal: 10000, spiritsMilk: 0, signInCoin: 0, towerScore: 0, reputation: 0, tongxin: 0, greenBottle: 0, fishingCoin: 300 },
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
  assert.ok(page.commands.includes('/购买 501 10'));
  assert.match(page.text, /灵鳞钱：300/);
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
