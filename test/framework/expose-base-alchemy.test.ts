import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/service', '-run', '^TestBaseAlchemyRecipeConfig$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const raw = output.match(/BASE_ALCHEMY_CONFIG=(.+)/)?.[1]; assert.ok(raw);
const config = JSON.parse(raw);
test('炼丹基础配方使用真实V2配置并拒绝玩家查询条件', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let count = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    count++; assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/base.alchemy-recipes');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { page: 1, pageSize: 20, knownVersion: '' });
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', data: { ...config, playerId: 999, inventory: [] }, middleware: { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } } } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_base_alchemy_recipes', input), 'ai-plugin');
  const result = await call({}); assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.deepEqual((result.value.data as any).result, config);
  assert.equal((await call({ uid: 999 })).value.ok, false); assert.equal(count, 1);
});
