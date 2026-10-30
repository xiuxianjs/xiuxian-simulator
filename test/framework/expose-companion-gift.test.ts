import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessCompanionCommandsGiftV1Arguments|TestRobotBusinessCompanionCommandsGiftLimitsAndCompanionTasks)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_COMPANION_COMMAND_RESPONSE=companion\.gift\|([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ args: JSON.parse(row[1]), envelope: JSON.parse(row[3]) })).filter(row => row.args.firstParam === '2' && (!row.args.secondParam || row.args.secondParam === '花'));
assert.ok(rows.some(row => row.envelope.data.success && row.envelope.data.data?.mode === 'OPTIONS'));
assert.ok(rows.some(row => row.envelope.data.success && row.envelope.data.data?.mode === 'GIFT'));
test('赠礼选项和结算保留目标、库存、奖励与重试', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/companion.gift');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const gift = !!current.args.secondParam;
    const input = gift ? { targetUid: 2, giftName: '花' } : { targetUid: 2 };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', gift ? 'send_gift' : 'get_gift_options', input), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any; const source = current.envelope.data;
    assert.equal(result.success, source.success);
    if (source.success && source.branch === 'business') {
      assert.equal(result.result.targetId, 2);
      if (gift) assert.equal(result.result.intimacyGained, source.data.mutation.intimacyGained);
      else assert.deepEqual(result.result.gifts, source.data.options.gifts);
    } else assert.equal(result.result, undefined);
    await call(); if (gift) assert.equal(keys.at(-1), keys.at(-2)); else assert.notEqual(keys.at(-1), keys.at(-2));
  }
});

test('赠礼任务入口保留服务端目标和结果', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async () => { const envelope = structuredClone(current.envelope); envelope.data.middleware.taskContinuation = { outcome: 'next', command: '我的资料' }; return { status: 200, headers: {}, data: JSON.stringify(envelope) }; } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const mode of ['OPTIONS', 'GIFT']) {
    current = rows.find(row => row.envelope.data.success && row.envelope.data.data?.mode === mode)!; assert.ok(current);
    const gift = mode === 'GIFT'; const action = gift ? 'send_gift' : 'execute_task_gift_options';
    const input = gift ? { targetUid: 2, giftName: '花', taskInput: '赠送 2 花' } : { targetUid: 2, taskInput: '赠送 2' };
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) { const result = run.value.data as any; assert.equal(result.result.targetId, 2); assert.equal(result.taskContinuation.outcome, 'next'); if (gift) assert.equal(result.result.intimacyGained, current.envelope.data.data.mutation.intimacyGained); else assert.deepEqual(result.result.gifts, current.envelope.data.data.options.gifts); }
  }
});
