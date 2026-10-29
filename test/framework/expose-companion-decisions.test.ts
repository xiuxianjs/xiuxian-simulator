import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('道侣申请处理使用服务端业务参数', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    const operation = new URL(request.url).pathname.split('/').at(-1);
    requests.push({ operation, body, key: request.headers['idempotency-key'] });
    const preflight = { initiatorName: '修士', target: { id: 8, name: '道友' }, oathItems: [{ itemId: 30, name: '盟书', quantity: 1, oathType: 'normal', desc: '誓约' }], friends: [], currentPage: 1, totalPages: 1, totalCount: 1 };
    const data = operation === 'companion.propose' ? { mode: 'command', command: { code: 'COMPLETED', preflight, result: { mutation: { success: true, message: '申请已发出', narrativeText: '' }, initiatorName: '修士' } } } : { mode: 'result', message: operation === 'companion.accept' ? '已同意' : '已拒绝' };
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const run = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  for (const action of ['accept_companion_proposal', 'reject_companion_proposal']) {
    const result = await run(action, { name: '道友', proposalId: 7, proposerId: 2, createdAt: '2026-10-29T00:00:00Z' });
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    assert.deepEqual(requests.at(-1).body.arguments, { name: '道友', proposalId: 7, proposerId: 2, createdAt: '2026-10-29T00:00:00Z' });
  }
  const before = requests.length;
  assert.equal((await run('accept_companion_proposal', { name: '', proposalId: 12, proposerId: 2, createdAt: '2026-10-29T00:00:00Z' })).value.ok, false);
  assert.equal(requests.length, before);
});
