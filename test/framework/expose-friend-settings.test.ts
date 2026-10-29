import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotFriendsExposeFixture$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_FRIENDS_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) })).filter(row => ['friends.random', 'friends.settings', 'friends.settings-update'].includes(row.op));
assert.equal(rows.length, 3);
test('推荐道友和好友设置保留服务端状态及重试', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.op === 'friends.settings-update' ? { enabled: true } : {}); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const write = current.op === 'friends.settings-update';
    const action = write ? 'set_friend_requests_enabled' : current.op === 'friends.random' ? 'find_random_friend' : 'get_friend_request_settings';
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, write ? { enabled: true } : {}), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) {
      const data = (run.value.data as any).result;
      if (current.op === 'friends.random') assert.equal(data.player?.uid, current.envelope.data.data.player?.uid);
      else assert.equal(data.isEnabled, current.envelope.data.data.isEnabled);
    }
    await call(); if (write) assert.equal(keys.at(-1), keys.at(-2)); else assert.notEqual(keys.at(-1), keys.at(-2));
  }
});
