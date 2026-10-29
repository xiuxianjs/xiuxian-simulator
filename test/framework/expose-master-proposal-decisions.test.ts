import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessMasterDecisionsListsTransactionsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_MASTER_VERSION_DECISION=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m => ({ op: m[1], bid: m[2], args: JSON.parse(m[3]), envelope: JSON.parse(m[4]) }));
for (const [action, op] of [['approve_master_application', 'master.binding-accept'], ['approve_master_graduation', 'master.graduation-accept'], ['reject_master_graduation', 'master.graduation-reject']] as const) test(`${action} 核验原申请并保留真实回执`, async t => {
  const row = rows.find(r => r.op === op && r.bid === 'player' && r.envelope.data.success && r.envelope.data.branch === 'business');
  assert.ok(row, op);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data; assert.deepEqual(body.arguments, row.args);
    keys.push(request.headers['idempotency-key']); return { status: 200, headers: {}, data: JSON.stringify(row.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const input = { proposalId: row.args.proposalId, discipleId: Number(row.args.discipleArg), createdAt: row.args.createdAt };
  for (let i = 0; i < 2; i++) {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value)); assert.deepEqual(run.messages, []);
    if (run.value.ok) assert.equal((run.value.data as any).result.message, row.envelope.data.data.message);
  }
  assert.equal(keys[0], keys[1]);
});
