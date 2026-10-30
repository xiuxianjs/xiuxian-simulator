import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeExploration$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_EXPLORATION=([^|]+)\|(.+)/g)].map(row => ({ key: row[1], envelope: JSON.parse(row[2]) }));
test('探索查询、出发与返程保留服务端预览及结算', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let args: any; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  for (const [key, operation, action, input, expected] of [
    ['view', 'seclusion.command', 'get_exploration', {}, { action: 'view' }],
    ['start', 'seclusion.command', 'start_exploration', { dungeonName: '桃花镇', duration: 4 }, { action: 'start', dungeonName: '桃花镇', duration: 4 }],
    ['end', 'seclusion.end', 'end_exploration', {}, {}],
    ['start-by-id', 'seclusion.command', 'start_exploration_by_id', { dungeonId: 2, duration: 4 }, { action: 'start', dungeonId: 2, duration: 4 }]
  ] as const) {
    op = operation; args = expected; const fixture = fixtures.find(row => row.key === key); assert.ok(fixture); envelope = structuredClone(fixture.envelope);
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, `${action}: ${JSON.stringify(response.value)}`);
    if (response.value.ok) {
      const result = (response.value.data as any).result;
      if (key === 'view') assert.equal(result.status.availableDungeons[0].name, '桃花镇');
      if (key === 'start') { assert.equal(result.code, 'OK'); assert.equal(result.record.spiritCost, 24); }
      if (key === 'start-by-id') { assert.equal(result.code, 'OK'); assert.equal(result.dungeon.id, 2); }
      if (key === 'end') { assert.equal(result.view.kind, 'refunded'); assert.equal(result.refundedSpirit, 24); }
    }
    await call(); if (key === 'view') assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
    if (key === 'start') { envelope.data.data.data.record.duration = 5; assert.equal((await call()).value.ok, false); }
    if (key === 'start-by-id') { envelope.data.data.data.dungeon.id = 1; assert.equal((await call()).value.ok, false); }
  }
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const before = keys.length;
  for (const dungeonId of [0, Number.MAX_SAFE_INTEGER + 1]) {
    const invalid = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'start_exploration_by_id', { dungeonId, duration: 4 }), 'ai-plugin');
    assert.equal(invalid.value.ok, false);
  }
  assert.equal(keys.length, before);
});

test('探索连锁任务读取 Go 服务端真实预览', async t => {
  const row = fixtures.find(item => item.key === 'view'); assert.ok(row);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async () => { const envelope = structuredClone(row.envelope); envelope.data.middleware.taskContinuation = { outcome: 'next', command: '我的资料' }; return { status: 200, headers: {}, data: JSON.stringify(envelope) }; } }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_exploration', { taskInput: '探索秘境' }), 'ai-plugin');
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) { assert.equal((result.value.data as any).result.status.availableDungeons[0].name, '桃花镇'); assert.equal((result.value.data as any).taskContinuation.outcome, 'next'); }
});
