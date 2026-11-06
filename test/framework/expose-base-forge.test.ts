import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/service', '-run', '^TestBaseForgeRecipeConfig$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const raw = output.match(/BASE_FORGE_CONFIG=(.+)/)?.[1]; assert.ok(raw);
const config = JSON.parse(raw);
test('锻造基础配方使用真实配置及提前打造规则并拒绝玩家查询条件', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let count = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    count++; assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/base.forge-recipes');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { page: 1, pageSize: 20, knownVersion: '' });
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', data: { ...config, playerId: 999, inventory: [], items: config.items.map((item: any) => ({ ...item, learned: true, ownerUid: 999, materials: item.materials.map((material: any) => ({ ...material, available: 999, stock: 999 })) })) }, middleware: { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } } } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_base_forge_recipes', input), 'ai-plugin');
  const result = await call({}); assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.deepEqual((result.value.data as any).result, config);
  for (const input of [{ uid: 999 }, { table: 'users' }, { page: 0 }, { pageSize: 101 }]) {
    assert.equal((await call(input)).value.ok, false);
  }
  assert.equal(count, 1);
});
