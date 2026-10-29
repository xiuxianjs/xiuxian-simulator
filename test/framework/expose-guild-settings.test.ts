import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('宗门设置保留服务端实际名称和境界，取消限制独立表示', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const calls: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    const op = new URL(request.url).pathname.split('/').at(-1);
    calls.push({ op, body, key: request.headers['idempotency-key'] });
    const clear = body.arguments.searchTerm === '无';
    const data = op === 'guild.rename' ? { outcome: 'result', message: '改名成功', receipt: { outcome: 'renamed', guildName: '新青云' } } : { outcome: 'result', message: clear ? '已取消入宗境界限制' : '设置成功', receipt: { outcome: 'updated', minRealmId: clear ? null : 2, realmName: clear ? null : '金丹初期', ...(clear ? {} : { matchedRealmName: '金丹初期' }) } };
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const run = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  for (let i = 0; i < 2; i++) {
    const res = await run('rename_guild', { name: '新青云' });
    assert.equal(res.value.ok, true, JSON.stringify(res.value));
    if (res.value.ok) assert.equal((res.value.data as any).result.guildName, '新青云');
    assert.deepEqual(res.messages, []);
  }
  assert.equal(calls[0].key, calls[1].key);
  const set = await run('set_guild_min_realm', { searchTerm: '金丹' });
  assert.equal(set.value.ok, true, JSON.stringify(set.value));
  if (set.value.ok) { assert.equal((set.value.data as any).result.minRealmId, 2); assert.equal((set.value.data as any).result.cleared, false); }
  const clear = await run('set_guild_min_realm', { searchTerm: '无' });
  assert.equal(clear.value.ok, true, JSON.stringify(clear.value));
  if (clear.value.ok) assert.equal((clear.value.data as any).result.cleared, true);
});
