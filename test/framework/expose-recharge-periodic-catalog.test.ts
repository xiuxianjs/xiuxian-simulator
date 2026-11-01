import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('周月礼包目录保留周期并限制私聊', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let period = 'weekly'; let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++;
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { period: 'weekly' });
    const data = { period, serverDate: '2026-11-01', periodStart: '2026-10-26', periodEnd: '2026-11-02', resetsAt: '2026-11-02T00:00:00+08:00', unresolvedOrderNo: null, products: [] };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', data, middleware: { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'owner', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } } } }) };
  } }));
  const call = (event: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_recharge_periodic_packs', { period: 'weekly' }), 'ai-plugin');
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' });
  assert.equal((await call(event)).value.ok, true);
  period = 'monthly'; assert.equal((await call(event)).value.ok, false);
  const group = { ...event, name: 'message.create', isPrivate: false, IsPrivate: false };
  assert.equal((await call(group)).value.ok, false); assert.equal(calls, 2);
});
