import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('公开劫云分页、搜索和详情保持事件边界', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const row = { eventId: 7, playerId: 2, name: '道友', currentRealm: '炼气', targetRealm: '筑基', targetStage: 2, tribulationName: '雷劫', requiredAttempts: 1, status: 'opened', opensAt: '2026-11-01T00:00:00Z', interactionOpen: false, canStart: false };
  let data: unknown = Array.from({ length: 6 }, (_, i) => ({ ...row, eventId: i + 1 }));
  let expected: object = { kind: 'list', offset: 5, limit: 6, playerId: 2 };
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/tribulation.public');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, expected); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', data, middleware: { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'owner', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } } } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' });
  const call = (action: string, input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  const result = await call('get_public_tribulations', { page: 2, playerId: 2 });
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) { const value = (result.value.data as any).result; assert.equal(value.hasMore, true); assert.equal(value.items.length, 5); }
  await call('get_public_tribulations', { page: 2, playerId: 2 }); assert.notEqual(keys[0], keys[1]);
  assert.equal((await call('get_public_tribulations', { playerId: 2, name: '道友' })).value.ok, false); assert.equal(keys.length, 2);
  expected = { kind: 'observe', eventId: 7 }; data = row;
  const detail = await call('get_public_tribulation', { eventId: 7 }); assert.equal(detail.value.ok, true, JSON.stringify(detail.value));
  if (detail.value.ok) assert.equal((detail.value.data as any).result.canStart, false);
  data = { ...row, eventId: 8 }; assert.equal((await call('get_public_tribulation', { eventId: 7 })).value.ok, false);
});
