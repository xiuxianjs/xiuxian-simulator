import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotFriendWritesExposeFixture$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_FRIEND_WRITE_EXPOSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], args: JSON.parse(row[2]), envelope: JSON.parse(row[3]) }));
for (const op of ['friends.request', 'friends.accept', 'friends.reject']) assert.ok(rows.some(row => row.op === op && row.envelope.data.success));
assert.ok(rows.some(row => row.op === 'friends.accept' && !row.envelope.data.success));
test('好友申请操作保留目标、回执和重试', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const action = current.op === 'friends.request' ? 'request_friend' : current.op === 'friends.accept' ? 'accept_friend_request' : 'reject_friend_request';
    const input = current.op === 'friends.request' ? { targetUid: Number(current.args.targetUid) } : { requestId: Number(current.args.requestId) };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any; const source = current.envelope.data;
    assert.equal(result.success, source.success);
    if (source.success && source.branch === 'business') {
      if (current.op === 'friends.request') assert.equal(result.result.outcome, source.data.outcome);
      else assert.equal(result.result.data?.requestId ?? result.result.data?.outcome, source.data.data?.requestId ?? source.data.data?.outcome);
    } else assert.equal(result.result, undefined);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
});
