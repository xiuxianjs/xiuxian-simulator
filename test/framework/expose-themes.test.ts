import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('主题查询和切换保留服务端状态与写入幂等', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const calls: any[] = [];
  let noTheme = false;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    const operation = new URL(request.url).pathname.split('/').at(-1);
    calls.push({ operation, body, key: request.headers['idempotency-key'] });
    const data = operation === 'themes.overview' ? { themes: [{ id: 12, name: '青云', config: '{}', source: 'system', isActive: false, sortOrder: 1 }], permission: { canCustomEdit: false, maxCustomSlots: 0 } } : operation === 'themes.activate' ? { outcome: 'activated', id: 12, name: '青云' } : operation === 'themes.deactivate' ? { removed: true } : { code: noTheme ? 'NO_ACTIVE_THEME' : 'OK', mode: 'dark' };
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const run = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  for (let i = 0; i < 2; i++) {
    const result = await run('get_themes', {});
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) assert.equal((result.value.data as any).result.themes[0].id, 12);
    assert.deepEqual(result.messages, []);
  }
  assert.notEqual(calls[0].key, calls[1].key);
  for (let i = 0; i < 2; i++) {
    const result = await run('activate_theme', { themeId: 12 });
    assert.equal(result.value.ok, true);
    if (result.value.ok) assert.equal((result.value.data as any).result.outcome, 'activated');
  }
  assert.equal(calls[2].key, calls[3].key);
  assert.deepEqual(calls[2].body.arguments, { themeId: 12 });
  const closed = await run('deactivate_theme', {});
  assert.equal(closed.value.ok, true);
  if (closed.value.ok) assert.equal((closed.value.data as any).result.removed, true);
  noTheme = true;
  const mode = await run('set_theme_ink_mode', { mode: 'dark' });
  assert.equal(mode.value.ok, true);
  if (mode.value.ok) assert.equal((mode.value.data as any).result.code, 'NO_ACTIVE_THEME');
  const before = calls.length;
  assert.equal((await run('activate_theme', { themeId: 0 })).value.ok, false);
  assert.equal((await run('set_theme_ink_mode', { mode: 'invalid' })).value.ok, false);
  assert.equal(calls.length, before);
});
