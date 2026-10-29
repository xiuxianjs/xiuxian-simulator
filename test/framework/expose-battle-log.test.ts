import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessBattleQueriesLogsTextMemoryExpiryAndRepeats|TestRobotBusinessBattleQueriesFaultsAndStrictInput)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_BATTLE_QUERY_RESPONSE=battle\.log\|([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ args: JSON.parse(row[1]), envelope: JSON.parse(row[3]) })).filter(row => row.args.logId);
assert.ok(rows.some(row => row.envelope.data.success && row.envelope.data.data?.text));
assert.ok(rows.some(row => row.envelope.data.success && row.envelope.data.data?.memoryShare));
assert.ok(rows.some(row => !row.envelope.data.success));
test('战斗日志区分文本、回忆、过期及读取错误', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/battle.log');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_battle_log', current.args), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any; const source = current.envelope.data;
    assert.equal(result.success, source.success);
    if (source.success && source.branch === 'business') {
      assert.equal(result.result.logId, source.data.logId);
      assert.equal(result.result.text, source.data.text ?? undefined);
      assert.equal(result.result.memoryAvailable, !!source.data.memoryShare);
      assert.equal(result.result.memoryExpiresAt, source.data.memoryShare?.expiresAt);
    } else assert.equal(result.result, undefined);
    await call(); assert.notEqual(keys.at(-1), keys.at(-2));
  }
});
