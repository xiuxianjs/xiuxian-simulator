import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildAutoRefreshStatesCASAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_GUILD_AUTO_REFRESH_RESPONSE=player\|(.+)/g)].map(row => JSON.parse(row[1]));
const view = fixtures.find(row => row.data.success && row.data.data?.outcome === 'view' && row.data.data.data.isLeader);
const set = fixtures.find(row => row.data.success && row.data.data?.outcome === 'set' && row.data.data.data.hours.length === 3);
assert.ok(view && set);
test('宗门自动刷新读取和设置保留服务端状态与重试行为', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let envelope = view; let expected: any = { mode: 'view' }; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/guild.auto-refresh');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, expected); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const run = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  for (let i = 0; i < 2; i++) {
    const r = await run('get_guild_auto_refresh', {}); assert.equal(r.value.ok, true, JSON.stringify(r.value));
    if (r.value.ok) assert.deepEqual((r.value.data as any).result, view.data.data.data);
  }
  assert.notEqual(keys[0], keys[1]);
  envelope = set; expected = { mode: 'hours', hours: [8, 12, 20] };
  for (let i = 0; i < 2; i++) {
    const r = await run('set_guild_auto_refresh', expected); assert.equal(r.value.ok, true, JSON.stringify(r.value));
    if (r.value.ok) assert.deepEqual((r.value.data as any).result.hours, [8, 12, 20]);
    assert.deepEqual(r.messages, []);
  }
  assert.equal(keys[2], keys[3]);
  const before = keys.length;
  for (const bad of [{ mode: 'hours', hours: [8, 8] }, { mode: 'hours', hours: [] }, { mode: 'disable', hours: [8] }, { mode: 'hours', hours: [24] }]) assert.equal((await run('set_guild_auto_refresh', bad)).value.ok, false);
  assert.equal(keys.length, before);
});
