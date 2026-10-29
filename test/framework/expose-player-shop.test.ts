import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('小店查询和管理使用服务端参数并保留回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const calls: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    const op = new URL(request.url).pathname.split('/').at(-1); calls.push({ op, body, key: request.headers['idempotency-key'] });
    const shop = { shopId: 1, userId: 7, ownerName: '修士', shopName: '青云', description: null, heatScore: 10, totalSales: 2, totalVolume: 3, level: 1, levelName: '初级', status: 1, activeListings: 0 };
    const item = { listingId: 9, sellerUserId: 7, sellerName: '修士', itemCategory: 'material', itemCategoryLabel: '材料', itemType: null, itemSubtype: null, templateItemId: 4, itemName: '灵草', quantity: 2, unitPriceAmount: 10, currencyCode: 'SPIRIT_CRYSTAL', currencyName: '灵晶', canPurchase: true, purchaseUnavailableReason: null, status: 1, lockedUntil: null, attributeAvailable: false, attributes: null, attributeView: null, createdAt: '2026-10-29T00:00:00Z', expiresAt: null, upgradeHint: '' };
    const data = op === 'player-shop.visit' ? { shop, items: [item], pagination: { currentPage: 1, totalPages: 1, total: 1 }, currencies: { spiritStone: 0, spiritsCrystal: 20, spiritsMilk: 0, signInCoin: 0, towerScore: 0, reputation: 0, tongxin: 0, greenBottle: 0 } } : op === 'player-shop.mine' ? shop : op === 'player-shop.list' ? { items: [shop], pageSize: 5, currentPage: 1, totalPages: 1, total: 1 } : op === 'player-shop.ranking' ? [{ rank: 1, shopName: '青云', ownerName: '修士', heatScore: 10, levelName: '初级', totalSales: 2 }] : { message: '设置完成' };
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const run = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  for (const [action, input, op] of [
    ['get_my_player_shop', {}, 'player-shop.mine'], ['list_player_shops', { page: 1 }, 'player-shop.list'],
    ['get_player_shop_ranking', {}, 'player-shop.ranking'], ['visit_player_shop', { ownerUid: 7 }, 'player-shop.visit'], ['rename_player_shop', { name: '青云' }, 'player-shop.rename'],
    ['set_player_shop_description', { description: '欢迎光临' }, 'player-shop.description']
  ] as const) {
    const result = await run(action, input); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    assert.equal(calls.at(-1).op, op); assert.deepEqual(result.messages, []);
    if (result.value.ok && action === 'visit_player_shop') assert.equal((result.value.data as any).result.items[0].listingId, 9);
    if (result.value.ok && action === 'list_player_shops') assert.equal((result.value.data as any).result.data[0].userId, 7);
  }
  assert.deepEqual(calls[1].body.arguments, { page: '1' });
  const before = calls.length;
  assert.equal((await run('rename_player_shop', { name: '', uid: 9 })).value.ok, false);
  assert.equal(calls.length, before);
});
