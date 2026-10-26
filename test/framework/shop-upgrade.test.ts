import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { createShopListHandler, shopBuyHandler } from '../../src/response/shop/handler';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const artifact = {
  shopCode: 'TOWER_SCORE', productId: 573, name: '灵蛇链·凡物', category: 'soul_artifact', itemId: 15,
  priceAmount: 200, priceCurrencyCode: 'TOWER_SCORE', priceCurrencyName: '积分', quantity: 1,
  secondaryPriceAmount: null, secondaryPriceCurrencyCode: null, secondaryPriceCurrencyName: null,
  grantCurrencyCode: null, grantCurrencyName: null, discountPriceAmount: null, discountRate: null, discountLabel: null,
  nextPurchaseAt: null, itemType: null, itemSubtype: null, typeLabel: '本命', requiredRealmId: null,
  requiredRealmName: null, requiredStars: null, lockReason: null, unlocked: true,
  limit: 3, used: 0, remaining: 3, limitPeriod: 'weekly', limitPeriodName: '每周'
};
const catalog = (products: object[]) => ({
  access: { hasCompanion: false, isFoundationRealm: true, canUseReputationShop: true, visibleShopCodes: ['WANBAOLOU', 'CHECKIN', 'TOWER_SCORE'], deniedReason: null },
  currencies: { spiritStone: 0, spiritsCrystal: 1000, spiritsMilk: 0, signInCoin: 100, towerScore: 1000, reputation: 0, tongxin: 0, greenBottle: 0 },
  page: 1, totalPages: 1, total: products.length, products
});

for (const isPrivate of [false, true]) {
  test(`商店真实处理器显示周额度、品级与售罄状态 ${isPrivate}`, async t => {
    const { app } = await gameFixture(t, r => businessEnvelope(r.bid, catalog([
      artifact, { ...artifact, productId: 575, name: '疾光羽·凡物', itemId: 16, used: 3, remaining: 0 }
    ])));
    const result = await app.runHandler(createShopListHandler(), isPrivate ? app.events.privateMessage({ text: '/商店 积分', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/商店 积分', platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    for (const text of ['灵蛇链·凡物', '每周限3份', '剩余3份', '本周已兑完', '每周一00:00重置']) assert.ok(message.text.includes(text), message.text);
    assert.ok(message.commands.includes('/购买 573'));
    assert.ok(!message.commands.includes('/购买 575'));
    assert.ok(message.commands.includes('/图鉴详情 本命 16'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    for (const command of message.commands) assert.ok([...command].length <= 80, command);
  });
}

test('商店显示实际折后价及签到同款入口', async t => {
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, catalog([
    { ...artifact, productId: 2, shopCode: 'WANBAOLOU', name: '精力丹', category: 'item', itemId: 38, typeLabel: '丹药', priceAmount: 80, priceCurrencyName: '灵晶', priceCurrencyCode: 'SPIRIT_CRYSTAL', discountPriceAmount: 74, discountRate: 0.93, discountLabel: '9.3折' }
  ])));
  const result = await app.runHandler(createShopListHandler(), app.events.privateMessage({ text: '/商店 万宝楼', platform: 'qq-bot' }));
  assert.ok(result.messages[0].text.includes('74 灵晶（原价80，9.3折）'));
  assert.ok(result.messages[0].commands.includes('/商店 签到 搜索 精力丹'));
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});

test('签到月额度售罄不生成购买按钮', async t => {
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, catalog([
    { ...artifact, productId: 574, shopCode: 'CHECKIN', priceAmount: 40, priceCurrencyName: '签到币', priceCurrencyCode: 'CHECKIN_COIN', limit: 1, used: 1, remaining: 0, limitPeriod: 'monthly', limitPeriodName: '每月' }
  ])));
  const result = await app.runHandler(createShopListHandler(), app.events.privateMessage({ text: '/商店 签到', platform: 'qq-bot' }));
  assert.ok(result.messages[0].text.includes('本月已兑完'));
  assert.ok(result.messages[0].text.includes('每月1日00:00重置'));
  assert.ok(!result.messages[0].commands.includes('/购买 574'));
});

for (const confirmedPreview of [false, true]) {
  test(`购买同款提示保留原付款，不自动改币种 ${confirmedPreview}`, async t => {
    const preview = { productId: 2, shopCode: 'WANBAOLOU', name: '精力丹', paid: '80 SPIRIT_CRYSTAL', granted: 1, buyCount: 1, needsConfirmation: confirmedPreview };
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, {
      preview, result: confirmedPreview ? null : { name: '精力丹', paid: preview.paid, granted: 1, buyCount: 1 },
      checkinAlternative: { ...preview, productId: 302, shopCode: 'CHECKIN', paid: '16 CHECKIN_COIN', granted: 2, needsConfirmation: false }
    }));
    const result = await app.runHandler(shopBuyHandler, app.events.privateMessage({ text: '/购买 2', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    const message = result.messages[0];
    assert.ok(message.text.includes('80 灵晶'), message.text);
    assert.ok(message.text.includes('16 签到币'), message.text);
    assert.ok(message.commands.includes('/商店 签到'));
    if (confirmedPreview) {
      assert.ok(message.commands.includes('/购买 2 确认'));
      assert.ok(message.commands.includes('/商店 万宝楼'));
    } else assert.ok(message.text.includes('下次补给也可选择'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
