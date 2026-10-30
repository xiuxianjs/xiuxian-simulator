import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeLimitedEvent$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_LIMITED_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
test('限时活动查询及领奖保留服务端状态和任务身份', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let args: any = {}; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [operation, action, input, expected, read] of [
    ['limited-event.overview', 'get_limited_events', {}, {}, true],
    ['limited-event.tasks', 'get_limited_event_tasks', {}, {}, true],
    ['limited-event.tokens', 'get_limited_event_tokens', {}, {}, true],
    ['limited-event.task-claim', 'claim_limited_event_task', { taskId: 1 }, { input: '/活动任务领取 1' }, false]
  ] as const) {
    op = operation; args = expected; envelope = structuredClone(fixtures.find(row => row.op === op)?.envelope); assert.ok(envelope, action);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    if (result.value.ok && action === 'claim_limited_event_task') assert.equal((result.value.data as any).result.taskId, 1);
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
    if (action === 'claim_limited_event_task') { envelope.data.data.taskId = 2; const mismatch = await call(); assert.equal(mismatch.value.ok, false); }
  }
});

test('活动任务步骤保留服务端任务列表和推进回执', async t => {
  const row = fixtures.find(item => item.op === 'limited-event.tasks' && item.envelope.data.success); assert.ok(row);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    const envelope = structuredClone(row.envelope);
    if (body.taskInput) envelope.data.middleware.taskContinuation = { outcome: 'next', command: '我的资料' };
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const normal = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_limited_event_tasks', {}), 'ai-plugin');
  const task = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_limited_event_tasks', { taskInput: '活动任务' }), 'ai-plugin');
  assert.ok(normal.value.ok && task.value.ok);
  assert.deepEqual((task.value.data as any).result, (normal.value.data as any).result);
  assert.deepEqual((task.value.data as any).taskContinuation, { outcome: 'next', command: '我的资料' });
});
