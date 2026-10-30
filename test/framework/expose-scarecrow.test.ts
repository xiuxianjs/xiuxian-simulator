import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessScarecrowV1BattleRoundsAndReplay|TestRobotBusinessScarecrowDomainFailureDoesNotSaveBattle|TestRobotBusinessScarecrowLogSaveFailure|TestRobotExposeScarecrowTaskAndDistinctIntent)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_SCARECROW_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ args: JSON.parse(row[1]), envelope: JSON.parse(row[3]) })).filter(row => row.args.roundsText === null || row.args.roundsText === '20');
const taskEnvelope = JSON.parse(output.match(/EXPOSE_SCARECROW_TASK=(.+)/)![1]);
assert.ok(rows.some(row => row.envelope.data.success && row.envelope.data.branch === 'business'));
test('稻草人伤害测试返回服务端统计并稳定重试', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/scarecrow.challenge');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const input = current.args.roundsText === null ? {} : { rounds: 20 };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'challenge_scarecrow', input), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any; const source = current.envelope.data;
    assert.equal(result.success, source.success);
    if (source.success && source.branch === 'business') {
      assert.equal(result.result.rounds, source.data.rounds);
      assert.equal(result.result.logId, source.data.logId);
      assert.deepEqual(result.result.summary, source.data.summary);
    } else assert.equal(result.result, undefined);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
});

test('稻草人任务区分新测试与原请求重试', async t => {
  assert.equal(taskEnvelope.data.success, true);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/挑战稻草人 20'); assert.equal(body.taskInput, '挑战稻草人 20'); assert.deepEqual(body.arguments, { roundsText: '20' });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(taskEnvelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (intentId: string, taskInput = '挑战稻草人 20') => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'challenge_scarecrow', { rounds: 20, intentId, taskInput }), 'ai-plugin');
  const first = await call('trial-1'); assert.equal(first.value.ok, true, JSON.stringify(first.value));
  if (first.value.ok) { const result = first.value.data as any; assert.deepEqual(result.taskContinuation, taskEnvelope.data.middleware.taskContinuation); assert.equal(result.result.logId, taskEnvelope.data.data.logId); }
  assert.equal((await call('trial-1')).value.ok, true); assert.equal(keys[0], keys[1]);
  assert.equal((await call('trial-2')).value.ok, true); assert.notEqual(keys[1], keys[2]);
  assert.equal((await call('trial-3', '挑战稻草人 10')).value.ok, false); assert.equal(keys.length, 3);
});
