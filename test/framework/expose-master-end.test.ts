import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessMaster(TargetsInteractionsInventoryAndReplay|QueriesGraduationRebelAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 24 * 1024 * 1024 }).toString();
const rows = [...output.matchAll(/ROBOT_MASTER(?:_TARGET)?_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], bid: row[2], envelope: JSON.parse(row[3]) }));
const expel = rows.find(row => row.op === 'master.expel' && row.bid === 'player' && row.envelope.data.data?.targetUid === 2);
const leave = rows.find(row => row.op === 'master.rebel' && row.bid === 'player' && row.envelope.data.success && row.envelope.data.branch === 'business');
assert.ok(expel && leave);
test('师门关系操作保留实际目标、回执和重试范围', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = expel; let args: any = { targetArg: '2' }; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data; assert.deepEqual(body.arguments, args);
    keys.push(request.headers['idempotency-key']); return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  for (let i = 0; i < 2; i++) { const run = await call('expel_disciple', { targetUid: 2 }); assert.equal(run.value.ok, true, JSON.stringify(run.value)); if (run.value.ok) assert.equal((run.value.data as any).result.targetUid, 2); }
  assert.equal(keys[0], keys[1]); current = leave; args = {};
  const run = await call('leave_master', {}); assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) assert.equal((run.value.data as any).result.message, leave.envelope.data.data.message);
  assert.deepEqual(run.messages, []);
});
