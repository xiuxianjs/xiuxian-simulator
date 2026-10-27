import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const backend = { api_url: 'https://backend.invalid', robot_auth_token: 'offline' };
const item = { id: 11, userItemId: 11, itemId: 3, name: '灵草', type: 'material', subtype: null, quantity: 10, listedQuantity: 2, stackMax: 999, permission: 0, isStackable: true, isLocked: 2, grade: null, realm: null, effect: null, capabilities: [{ kind: 'viewRecipe', recipeId: 8 }] };
const inventory = { activeSubcategory: 'herb', playerStageLevel: 4, pagination: { page: 2, pageSize: 5, total: 6, totalPages: 2 }, items: [item], capabilities: [{ kind: 'viewProfile' }] };
const summary = { slot: 0, name: '当前', equipmentCount: 1, equipmentNames: ['铁剑'], skillNames: { attack: '剑诀' }, missingEquipmentCount: 0, missingSkillCount: 1 };
const templates = { current: summary, templates: [{ ...summary, slot: 1, name: '常用' }] };

for (const action of ['get_inventory', 'get_battle_templates'] as const) {
  for (const scenario of ['success', 'empty', 'malformed', 'forbidden', 'disabled', 'spoof uid', 'cancel pending'] as const) {
    test(`${action}: ${scenario}`, async t => {
      const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend, ...(scenario === 'disabled' ? { expose: { enabled: false } } : {}) } } });
      t.after(() => app.dispose());
      await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
      const controller = new AbortController();
      const requests: string[] = [];
      let aborted = false;
      t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
        const url = new URL(request.url);
        requests.push(url.pathname);
        assert.equal(request.method, 'GET');
        assert.equal(request.headers['x-bid'], 'owner');
        if (url.pathname === '/api/v1/robot/identity') return { status: 200, headers: {}, data: JSON.stringify({ data: { bid: 'owner', account: { status: 'registered', playerId: 7 } } }) };
        assert.equal(url.pathname, `/api/v1/players/7/${action === 'get_inventory' ? 'inventory' : 'battle-templates'}`);
        if (action === 'get_inventory') {
          assert.equal(url.searchParams.get('page'), '2');
          assert.equal(url.searchParams.get('category'), 'material');
          assert.equal(url.searchParams.get('subtype'), 'herb');
          assert.equal(url.searchParams.get('view'), 'bag');
        }
        if (scenario === 'cancel pending') return new Promise((_resolve, reject) => {
          request.signal.addEventListener('abort', () => { aborted = true; reject(new Error('cancelled')); }, { once: true });
          controller.abort();
        });
        let data: unknown = action === 'get_inventory' ? inventory : templates;
        if (scenario === 'empty') data = action === 'get_inventory' ? { ...inventory, items: [], pagination: { page: 2, pageSize: 5, total: 0, totalPages: 0 } } : { ...templates, templates: [] };
        if (scenario === 'malformed') data = action === 'get_inventory' ? { ...inventory, items: [{ ...item, quantity: '10' }] } : { ...templates, current: { ...summary, skillNames: { attack: 99 } } };
        return { status: scenario === 'forbidden' ? 403 : 200, headers: {}, data: JSON.stringify({ data }) };
      } }));
      const input = action === 'get_inventory' ? { category: 'material', subtype: 'herb', page: 2 } : {};
      const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, { ...input, ...(scenario === 'spoof uid' ? { uid: 999 } : {}) }, { signal: controller.signal }), 'ai-plugin');
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.messages, []);
      assert.deepEqual(result.actions, []);
      if (scenario === 'success' || scenario === 'empty') {
        assert.equal(result.value.ok, true);
        if (!result.value.ok) return;
        const data = result.value.data as any;
        if (action === 'get_inventory') {
          assert.deepEqual(data.pagination, scenario === 'empty' ? { page: 2, pageSize: 5, total: 0, totalPages: 0 } : inventory.pagination);
          if (scenario === 'success') assert.deepEqual(data.items, [{ userItemId: 11, itemId: 3, name: '灵草', type: 'material', quantity: 10, listedQuantity: 2, stackMax: 999, permission: 0, isStackable: true, lockState: 2, capabilities: item.capabilities }]);
          else assert.deepEqual(data.items, []);
        } else {
          assert.deepEqual(data.current.skills, [{ slot: 'attack', name: '剑诀' }]);
          assert.equal(data.current.missingSkillCount, 1);
          assert.equal(data.templates.length, scenario === 'empty' ? 0 : 1);
        }
      } else {
        assert.equal(result.value.ok, false);
        if (!result.value.ok) assert.equal(result.value.error.code, scenario === 'disabled' ? 'FORBIDDEN' : scenario === 'spoof uid' ? 'INVALID_INPUT' : scenario === 'cancel pending' ? 'ABORTED' : 'HANDLER_FAILED');
      }
      assert.equal(requests.length, ['disabled', 'spoof uid'].includes(scenario) ? 0 : 2);
      if (scenario === 'cancel pending') assert.equal(aborted, true);
    });
  }
}

for (const input of [{}, { category: 'equipment' }, { category: 'prop', page: 0 }, { category: 'prop', page: 1.5 }, { category: 'prop', subtype: '' }]) {
  test(`背包拒绝无效参数 ${JSON.stringify(input)}`, async t => {
    const app = createTestApp();
    t.after(() => app.dispose());
    await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
    t.mock.method(axios, 'create', () => { throw new Error('unexpected HTTP'); });
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_inventory', input), 'ai-plugin');
    assert.equal(result.value.ok, false);
    if (!result.value.ok) assert.equal(result.value.error.code, 'INVALID_INPUT');
  });
}
