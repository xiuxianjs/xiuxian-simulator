import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessCave(NearbyV1AndState|VisitV1TargetsAndPrivacy|LogsV1AndReadOnly|SocialV1TargetsAndTransactions)/(ready|mature)', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], args: JSON.parse(row[2]), envelope: JSON.parse(row[4]) }));
test('灵田访问与社交操作保留真实目标和回执', async t => {
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
    ['cave.nearby', 'get_nearby_caves', {}, {}, true],
    ['cave.visit', 'visit_cave', { ownerUid: 2 }, { target: { uid: 2 } }, true],
    ['cave.logs', 'get_cave_logs', {}, { page: '1' }, true],
    ['cave.collaborate', 'collaborate_cave', { ownerUid: 2, action: 'water' }, { mode: 'command', ownerUid: '2', ownerBid: null, plotIndex: null, careAction: 'water' }, false],
    ['cave.steal', 'steal_cave_crop', { ownerUid: 2 }, { mode: 'command', ownerUid: '2', ownerBid: null, plotIndex: null, careAction: null }, false]
  ] as const) {
    op = operation; args = expected;
    const fixture = fixtures.find(row => row.op === op && row.envelope.data.success && row.envelope.data.branch === 'business' &&
      JSON.stringify(Object.entries(row.args).sort()) === JSON.stringify(Object.entries(expected).sort()));
    envelope = structuredClone(fixture?.envelope); assert.ok(envelope, action);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, `${action}: ${JSON.stringify(response.value)}`);
    if (response.value.ok) {
      const data = response.value.data as any;
      assert.equal(data.success, true);
      if (action === 'visit_cave') assert.equal(data.result.ownerUid, 2);
      if (action === 'steal_cave_crop') assert.equal(data.result.ownerUid, 2);
    }
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
    if (!read) {
      const invokeIntent = (intentId: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, { ...input, intentId }), 'ai-plugin');
      assert.equal((await invokeIntent('first')).value.ok, true);
      const first = keys.at(-1);
      assert.equal((await invokeIntent('first')).value.ok, true);
      assert.equal(keys.at(-1), first);
      assert.equal((await invokeIntent('second')).value.ok, true);
      assert.notEqual(keys.at(-1), first);
      const before = keys.length;
      assert.equal((await invokeIntent('invalid intent')).value.ok, false);
      assert.equal(keys.length, before);
    }
    if (action === 'visit_cave') {
      envelope.data.data.ownerId = 99;
      const mismatch = await call(); assert.equal(mismatch.value.ok, false);
    }
  }
});

test('访问灵田任务保留服务端目标和可见结果', async t => {
  const fixture = fixtures.find(row => row.op === 'cave.visit' && row.envelope.data.success && row.envelope.data.branch === 'business' && row.args.target?.uid === 2); assert.ok(fixture);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async () => { const envelope = structuredClone(fixture.envelope); envelope.data.middleware.taskContinuation = { outcome: 'next', command: '我的资料' }; return { status: 200, headers: {}, data: JSON.stringify(envelope) }; } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const normal = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'visit_cave', { ownerUid: 2 }), 'ai-plugin');
  const task = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_visit_cave', { ownerUid: 2, taskInput: '查看灵田 2' }), 'ai-plugin');
  assert.ok(normal.value.ok && task.value.ok); assert.deepEqual((task.value.data as any).result, (normal.value.data as any).result); assert.equal((task.value.data as any).taskContinuation.outcome, 'next');
});
