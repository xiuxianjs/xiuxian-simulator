import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessWorldBossQueriesFactsFailuresAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
for (const item of [
  { operation: 'world-boss.ranking', action: 'get_world_boss_leaderboard', field: 'ranking' },
  { operation: 'world-boss.rewards', action: 'get_world_boss_rewards', field: 'tiers' }
]) {
  const rows = [...output.matchAll(/ROBOT_WORLD_BOSS_QUERY_RESPONSE=([^|]+)\|player\|(.+)/g)].filter(row => row[1] === item.operation).map(row => JSON.parse(row[2]));
  assert.ok(rows.some(row => row.data.success) && rows.some(row => !row.data.success));
  test(`${item.operation} 保留服务端查询和拒绝`, async t => {
    const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
    t.after(() => app.dispose());
    await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
    let current = rows[0];
    const keys: string[] = [];
    t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
      assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${item.operation}`);
      const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
      assert.deepEqual(body.arguments, {});
      keys.push(request.headers['idempotency-key']);
      return { status: 200, headers: {}, data: JSON.stringify(current) };
    } }));
    for (current of rows) {
      const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
      const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', item.action, {}), 'ai-plugin');
      const run = await call();
      assert.deepEqual(run.errors, []);
      assert.equal(run.value.ok, true, JSON.stringify(run.value));
      if (!run.value.ok) continue;
      const result = run.value.data as any;
      assert.equal(result.success, current.data.success);
      if (result.success && result.branch === 'business') assert.deepEqual(result.result[item.field], current.data.data[item.field]);
      else assert.equal(result.result, undefined);
      const again = await call();
      assert.equal(again.value.ok, true);
      assert.notEqual(keys.at(-1), keys.at(-2));
    }
  });
}

test('凶兽连锁任务读取 Go 服务端真实状态', async t => {
  const row = [...output.matchAll(/ROBOT_WORLD_BOSS_QUERY_RESPONSE=([^|]+)\|player\|(.+)/g)].filter(match => match[1] === 'world-boss.info').map(match => JSON.parse(match[2])).find(item => item.data.success && item.data.branch === 'business'); assert.ok(row);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async () => { const envelope = structuredClone(row); envelope.data.middleware.taskContinuation = { outcome: 'next', command: '我的资料' }; return { status: 200, headers: {}, data: JSON.stringify(envelope) }; } }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_world_boss', { taskInput: '凶兽' }), 'ai-plugin');
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) { assert.equal((result.value.data as any).result.remainingAttempts, String(row.data.data.remainingAttempts)); assert.equal((result.value.data as any).taskContinuation.outcome, 'next'); }
});
