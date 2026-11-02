import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('基础数据查询仅输出配置白名单并拒绝玩家和任意表查询', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let count = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    count++; const path = new URL(request.url).pathname;
    const data = path.endsWith('/encyclopedia/categories')
      ? { items: [{ category: '道具', subCategories: ['丹药'], players: [{ uid: 999 }] }, { category: '玩家', subCategories: [] }], password: 'must-not-leave' }
      : path.endsWith('/encyclopedia')
        ? { items: [{ id: 1, name: '聚气丹', gradeName: '一品', ownerUid: 999, stock: 10 }], page: { page: 1, totalPages: 1, totalCount: 1 }, players: [{ uid: 999 }] }
        : { bid: 'owner', account: { status: 'registered', playerId: 7 } };
    return { status: 200, headers: {}, data: JSON.stringify({ data }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' });
  const call = (action: string, input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  const categories = await call('get_base_data_categories', {}); assert.equal(categories.value.ok, true, JSON.stringify(categories.value));
  if (categories.value.ok) assert.deepEqual(categories.value.data, { categories: [{ category: '道具', subCategories: ['丹药'] }] });
  const entries = await call('get_base_data_entries', { category: '道具', subCategory: '丹药' }); assert.equal(entries.value.ok, true, JSON.stringify(entries.value));
  if (entries.value.ok) assert.deepEqual(entries.value.data, { items: [{ id: 1, name: '聚气丹', gradeName: '一品' }], page: 1, totalPages: 1, totalCount: 1 });
  const before = count;
  for (const input of [{ category: '玩家' }, { category: '道具', uid: 999 }, { category: '道具', table: 'users' }]) assert.equal((await call('get_base_data_entries', input)).value.ok, false);
  assert.equal(count, before);
});
