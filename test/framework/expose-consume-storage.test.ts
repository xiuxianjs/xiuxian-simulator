import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { fileURLToPath } from 'node:url';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('通过储物记录 ID 使用物品，并保留原请求重试键', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/items.consume');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { storageId: 9, quantity: 2, mode: 'expose' }); keys.push(request.headers['idempotency-key']);
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data: { outcome: 'consumed', message: '已使用', remainingQuantity: 1 } } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'consume_inventory_item', { storageId: 9, quantity: 2 }), 'ai-plugin');
  const result = await call(); assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.equal((result.value.data as any).result.remainingQuantity, 1);
  await call(); assert.equal(keys[0], keys[1]);
});


test('储物记录使用接收真实服务端回执', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeItemsContracts$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
  const rows = [...output.matchAll(/EXPOSE_ITEMS_HTTP=items\.consume\|([^|]+)\|(.+)/g)].map(row => ({ args: JSON.parse(row[1]), envelope: JSON.parse(row[2]) }));
  const fixtures = rows.filter(row => Number.isSafeInteger(row.args.storageId));
  assert.equal(fixtures.length, 3);
  let fixture = fixtures[0];
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { ...fixture.args, mode: 'expose' });
    return { status: 200, headers: {}, data: JSON.stringify(fixture.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (fixture of fixtures) {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'consume_inventory_item', { storageId: fixture.args.storageId, quantity: fixture.args.quantity }), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) {
      const result = (run.value.data as any).result;
      assert.equal(result.outcome, fixture.envelope.data.data.outcome);
      if (result.outcome === 'peiyuan_pending') assert.equal(result.peiyuanPending.snapshot, fixture.envelope.data.data.pending.snapshot);
      if (result.outcome === 'mingwu_select') assert.ok(result.mingwuSelection.books.length > 0);
    }
  }
});

test('阵盘经通用消耗入口收到服务端拒绝，不伪造成功', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeItemsContracts$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
  const match = output.match(/EXPOSE_FORMATION_CONSUME_DENIED=(\d+)\|(\d+)\|(.+)/); assert.ok(match);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { mode: 'expose', storageId: Number(match[1]), quantity: 1 });
    return { status: Number(match[2]), headers: {}, data: match[3] };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'consume_inventory_item', { storageId: Number(match[1]), quantity: 1 }), 'ai-plugin');
  assert.equal(result.value.ok, false);
});
