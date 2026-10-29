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
const rows = [...output.matchAll(/ROBOT_FRIENDS_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) })).filter(row => row.op === 'friends.overview' || row.op === 'friends.requests');
assert.equal(rows.length, 2);
test('好友和申请列表返回本人实际社交数据', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.op === 'friends.overview' ? { page: 1, pageSize: 5 } : {}); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', current.op === 'friends.overview' ? 'get_friends' : 'get_friend_requests', {}), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) {
      const data = (run.value.data as any).result;
      assert.equal(data.access.ok, true);
      if (current.op === 'friends.overview') assert.equal(data.data.list[0].friendId, 2);
      else assert.equal(data.data[0].fromUserId, 3);
    }
    await call(); assert.notEqual(keys.at(-1), keys.at(-2));
  }
});
