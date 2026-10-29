import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessForgeLifecycleAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_FORGE_EXPOSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], bid: row[2], key: row[3], envelope: JSON.parse(row[4]) }));
test('锻造委托绑定原预览、真实身份并返回交付和退款状态', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let args: any = {}; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const token = fixtures.find(row => row.key === 'order-preview')!.envelope.data.data.token;
  for (const [operation, key, action, input, expected, read] of [
    ['forge.order-preview', 'order-preview', 'preview_forge_order', { crafterId: 1, recipeId: 1, fee: 7 }, { crafterId: 1, recipeId: 1, fee: 7 }, false],
    ['forge.order-create', 'order-create', 'create_forge_order', { reference: token }, { token }, false],
    ['forge.orders', 'orders-crafter', 'get_forge_orders', {}, { page: 1 }, true],
    ['forge.order-accept', 'order-accept', 'accept_forge_order', { orderId: 1 }, { orderId: 1 }, false],
    ['forge.order-cancel', 'refund-complete', 'cancel_forge_order', { orderId: 2 }, { orderId: 2 }, false],
    ['forge.history', 'history-crafter', 'get_forge_history', {}, { page: 1 }, true]
  ] as const) {
    op = operation; args = expected; const fixture = fixtures.find(row => row.key === key); assert.ok(fixture, action); envelope = structuredClone(fixture.envelope);
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: fixture.bid });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, `${action}: ${JSON.stringify(response.value)}`);
    if (response.value.ok && action === 'accept_forge_order') assert.equal((response.value.data as any).result.status, 'delivered');
    if (response.value.ok && action === 'cancel_forge_order') assert.equal((response.value.data as any).result.status, 'expired');
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
    if (action === 'accept_forge_order') { envelope.data.data.crafterId = 3; const mismatch = await call(); assert.equal(mismatch.value.ok, false); }
  }
});
