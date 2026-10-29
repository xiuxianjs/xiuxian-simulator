import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('好友删除预览不提交，确认保留服务端结果与稳定重试键', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: any[] = [];
  let outcome = 'removed';
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    requests.push({ body, key: request.headers['idempotency-key'] });
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/friends.remove');
    const confirmed = body.arguments.confirmed;
    const data = { outcome: confirmed ? 'result' : 'confirmation_required', realmName: null, targetId: '8', target: { id: 8, name: '道友' }, ...(confirmed ? { removal: { outcome, realmName: null } } : {}) };
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const run = (action: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, { targetUid: 8 }), 'ai-plugin');
  for (let i = 0; i < 2; i++) {
    const result = await run('preview_remove_friend');
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) assert.equal((result.value.data as any).result.outcome, 'confirmation_required');
    assert.deepEqual(result.messages, []);
  }
  assert.deepEqual(requests[0].body.arguments, { confirmed: false, targetUid: '8' });
  assert.notEqual(requests[0].key, requests[1].key);
  outcome = 'companion';
  for (let i = 0; i < 2; i++) {
    const result = await run('confirm_remove_friend');
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) assert.equal((result.value.data as any).result.removal.outcome, 'companion');
  }
  assert.deepEqual(requests[2].body.arguments, { confirmed: true, targetUid: '8' });
  assert.equal(requests[2].key, requests[3].key);
});
