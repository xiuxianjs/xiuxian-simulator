import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotFriendWritesExposeFixture|TestRobotExposeFriendTaskAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_FRIEND_WRITE_EXPOSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], args: JSON.parse(row[2]), envelope: JSON.parse(row[3]) }));
const taskRows = new Map([...output.matchAll(/EXPOSE_FRIEND_TASK=([^|]+)\|(.+)/g)].map(row => [row[1], JSON.parse(row[2])]));
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
    if (current.op === 'friends.request') assert.equal(body.messageText, `/结交 ${current.args.targetUid}`);
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

for (const [op, action, verb] of [['friends.request', 'request_friend', '结交'], ['friends.accept', 'accept_friend_request', '同意结交'], ['friends.reject', 'reject_friend_request', '拒绝结交']] as const) test(`${action}: 任务指令与目标一致`, async t => {
  const source = rows.find(row => row.op === op && row.envelope.data.success && row.envelope.data.branch === 'business'); assert.ok(source);
  const field = op === 'friends.request' ? 'targetUid' : 'requestId';
  const id = Number(source.args[field]); const command = `${verb} ${id}`;
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, `/${command}`); assert.equal(body.taskInput, command); assert.deepEqual(body.arguments, source.args);
    keys.push(request.headers['idempotency-key']);
    const envelope = taskRows.get(op); assert.ok(envelope);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, { [field]: id, taskInput, intentId: 'friend-1' }), 'ai-plugin');
  const first = await call(command); assert.equal(first.value.ok, true, JSON.stringify(first.value));
  if (first.value.ok) assert.deepEqual((first.value.data as any).taskContinuation, taskRows.get(op).data.middleware.taskContinuation);
  assert.equal((await call(command)).value.ok, true); assert.equal(keys[0], keys[1]);
  assert.equal((await call(`${verb} ${id + 1}`)).value.ok, false); assert.equal(keys.length, 2);
});
