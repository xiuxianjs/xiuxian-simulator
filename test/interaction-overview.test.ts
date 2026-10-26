import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import accept from '../src/response-apps/companion/accept/app';
import reject from '../src/response-apps/companion/reject/app';
import { checkUpgradeOath } from '../src/response-apps/companion/upgradeOath/app';
import { checkBreakup } from '../src/response-apps/companion/breakup/app';
import { findTargetUser, getOathItemsForPropose, performPropose } from '../src/response-apps/companion/propose/app';
import { checkShopBuy } from '../src/response-apps/companion/shopBuy/app';
import { getBackendNamedGacha, purchaseBackendShopOverview } from '../src/api/bot/interaction-overview';
import { getBackendOwnPlayerShop } from '../src/api/bot/player-shop-own';

const request = { requestId: 'trace', idempotencyKey: 'message-1' };
const setup = (t: Parameters<typeof mockBackendConfig>[0], value: unknown) => {
  mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token', api_timeout_ms: 10000 });
  const calls: Record<string, unknown>[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (config: Record<string, unknown>) => { calls.push(config); return { status: 200, headers: {}, data: JSON.stringify({ data: value }) }; } }));
  return calls;
};
const info = { access: { canUseFifthLayerFeature: true, realmName: '炼气' }, noCompanionMessage: null, companion: { partnerId: 2, partnerName: '乙', partnerRealm: '炼气', intimacy: 200, tongxin: 10, blessingPercent: 3, dualCultivationExp: 300, dailyDualCultivationUsed: 0, dailyDungeonUsed: 0, dailyGiftUsed: 0, companionSince: '2026-09-24', anniversaryMessage: null, displayPartnerName: '乙', displayPartnerRealm: '炼气', spiritBondLevel: '共修', companionMessage: '原文', oathType: 'normal' } };
const preview = { partnerId: 2, partnerName: '乙', currentBlessingPercent: 3, upgradedBlessingPercent: 6 };

for (const [action, app] of [['accept', accept], ['reject', reject]] as const) {
  test(`proposal ${action} resolves name and settles within one request`, async t => {
    const calls = setup(t, { success: true, message: '原结果' });
    const result = await app({ bid: 'bid', uid: 1, proposerName: '乙', request });
    assert.equal(result.code, 'OK');
    assert.equal(calls.length, 1);
    assert.match(JSON.stringify(calls), new RegExp(`by-name/${action}`));
  });
}

test('oath confirmation obtains preview and mutation in one request', async t => {
  const calls = setup(t, { info, preview, mutation: { success: true, message: '升级成功' } });
  const result = await checkUpgradeOath({ bid: 'bid', uid: 1, confirmed: true, request });
  assert.equal(result.code, 'CONFIRM_NEEDED');
  if (result.code === 'CONFIRM_NEEDED') { assert.equal(result.data.settledResult?.code, 'OK'); }
  assert.equal(calls.length, 1);
});

test('breakup confirmation keeps pre-mutation partner for original rendering', async t => {
  const calls = setup(t, { info, preview: null, mutation: { success: true, message: '解除成功', narrativeText: '原离别文案' } });
  const result = await checkBreakup({ bid: 'bid', uid: 1, confirmed: true, request });
  assert.equal(result.code, 'CONFIRM_NEEDED');
  if (result.code === 'CONFIRM_NEEDED') { assert.equal(result.data.partnerName, '乙'); assert.equal(result.data.settledResult?.code, 'OK'); }
  assert.equal(calls.length, 1);
});

test('proposal selection reuses target preflight oath facts without another HTTP request or write context', async t => {
  const calls = setup(t, { initiatorName: '甲', target: { id: 2, name: '乙' }, oathItems: [{ itemId: 3, name: '白首盟书', quantity: 1, oathType: 'normal', desc: '原文' }], friends: [], currentPage: 1, totalPages: 0, totalCount: 0 });
  const target = await findTargetUser('bid', 1, '乙');
  assert.equal(target.code, 'FOUND');
  if (target.code === 'FOUND') { assert.equal((await getOathItemsForPropose({ bid: 'bid', uid: 1, preflight: target.preflight })).code, 'OK'); }
  assert.equal(calls.length, 1);
});

test('proposal mutation returns initiator text without a following preflight', async t => {
  const calls = setup(t, { mutation: { success: true, message: '道侣申请已发送' }, initiatorName: '甲' });
  assert.equal((await performPropose({ bid: 'bid', uid: 1, targetId: 2, itemId: 3, request })).code, 'OK');
  assert.equal(calls.length, 1);
});

test('confirmed companion shop combines preflight and settlement', async t => {
  const calls = setup(t, { preview: { productId: 1, name: '礼物', unitPrice: 2, totalPrice: 2, grantQuantity: 1, count: 1 }, result: { name: '礼物', paid: '2 同心值', granted: 1, buyCount: 1 } });
  const result = await checkShopBuy({ bid: 'bid', uid: 1, productId: 1, count: 1, confirmed: true, request });
  assert.equal(result.code, 'CONFIRM_NEEDED');
  if (result.code === 'CONFIRM_NEEDED') { assert.equal(result.data.settledResult?.code, 'OK'); }
  assert.equal(calls.length, 1);
});

test('unified shop confirmation page remains read-only without message identity', async t => {
  const calls = setup(t, { preview: { productId: 1, shopCode: 'WANBAOLOU', name: '礼物', paid: '2 灵晶', granted: 1, buyCount: 1, needsConfirmation: true }, result: null });
  assert.equal((await purchaseBackendShopOverview('bid', 1, 1, 1, false)).result, null);
  assert.equal(calls.length, 1);
});

test('own shop initializes and projects in one request', async t => {
  const calls = setup(t, { shopId: 1, userId: 1, heatScore: 0, totalSales: 0, totalVolume: 0, activeListings: 0, ownerName: '甲', shopName: '甲的小店', description: null, level: 1, status: 1, levelName: '小店' });
  assert.equal((await getBackendOwnPlayerShop('bid', 1, request)).shopId, 1);
  assert.equal(calls.length, 1);
});

for (const view of ['goods', 'history', 'pull'] as const) {
  test(`gacha named ${view} returns access short-circuit in one request without write context`, async t => {
    const calls = setup(t, { catalog: { active: false, accessStatus: 'NO_BANNER', bannerId: 0, minRealm: null, userRealm: null, pools: [] }, data: null });
    const result = await getBackendNamedGacha('bid', 1, '甲', view, 1);
    assert.equal(result.banner.ok, false);
    assert.equal(calls.length, 1);
  });
}

test('accept inbox remains one read without write context', async t => {
  const calls = setup(t, { received: [] });
  assert.equal((await accept({ bid: 'bid', uid: 1 })).code, 'LIST');
  assert.equal(calls.length, 1);
});

for (const view of ['goods', 'history', 'pull'] as const) {
  test(`gacha ${view} resolves ready pool and returns page facts together`, async t => {
    const data = view === 'pull' ? { success: true, message: '原结果', items: [], freeUsed: 1, costAmount: 0, costCurrency: 'SPIRIT_CRYSTAL', costCurrencyName: '灵晶' } : [];
    const calls = setup(t, { catalog: { active: true, accessStatus: 'READY', bannerId: 1, minRealm: null, userRealm: null, pools: [{ id: 2, poolName: '甲', realm: null, merchantTitle: '小友' }] }, data });
    const result = await getBackendNamedGacha('bid', 1, '甲', view, 1, request);
    assert.equal(result.banner.ok, true);
    if (view === 'pull') { assert.equal(result.pull?.success, true); }
    assert.equal(calls.length, 1);
  });
}
