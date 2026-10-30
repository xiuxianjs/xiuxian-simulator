import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessSecretRealmQueriesV1ScheduleAndReplay|TestRobotBusinessSecretRealmActionsChallenge|TestRobotBusinessSecretRealmActionsClaimTransactionAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_SECRET_REALM_(?:ACTION_)?RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], args: JSON.parse(row[2]), envelope: JSON.parse(row[3]) }));
const specs: Record<string, { action: string; input: any; args: any; read: boolean }> = {
  'secret-realm.home': { action: 'get_spirit_vein_war', input: {}, args: {}, read: true },
  'secret-realm.list': { action: 'list_spirit_vein_realms', input: {}, args: { page: '1' }, read: true },
  'secret-realm.view': { action: 'get_spirit_vein_positions', input: { realmNo: 1 }, args: { realmNo: '1', page: '1' }, read: true },
  'secret-realm.challenge': { action: 'challenge_spirit_vein_position', input: { realmNo: 1, positionNo: 1 }, args: { realmNo: '1', positionNo: '1' }, read: false },
  'secret-realm.claim': { action: 'claim_spirit_vein_war_rewards', input: {}, args: {}, read: false }
};
const selected = rows.filter(row => specs[row.op] && JSON.stringify(row.args) === JSON.stringify(specs[row.op].args));
for (const op of Object.keys(specs)) assert.ok(selected.some(row => row.op === op && row.envelope.data.success && row.envelope.data.branch === 'business'), op);
test('灵脉攻防战能力保留服务端状态、结算及重试', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = selected[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, specs[current.op].args);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of selected) {
    const spec = specs[current.op];
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', spec.action, spec.input), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any; const source = current.envelope.data;
    assert.equal(result.success, source.success);
    if (source.success && source.branch === 'business') {
      if (current.op === 'secret-realm.home') assert.equal(result.result.isActive, source.data.isActive);
      if (current.op === 'secret-realm.list') assert.deepEqual(result.result.items, source.data);
      if (current.op === 'secret-realm.view') assert.equal(result.result.positions.length, source.data.length);
      if (current.op === 'secret-realm.challenge') assert.equal(result.result.won, source.data.won);
      if (current.op === 'secret-realm.claim') assert.deepEqual(result.result, source.data);
    } else assert.equal(result.result, undefined);
    await call(); if (spec.read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
  }
});

test('无编号灵脉任务保留服务端用法反馈', async t => {
  const row = rows.find(item => item.op === 'secret-realm.view' && item.args.realmNo === null && !item.envelope.data.success); assert.ok(row);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async () => { const envelope = structuredClone(row.envelope); envelope.data.middleware.taskContinuation = { outcome: 'next', command: '我的资料' }; return { status: 200, headers: {}, data: JSON.stringify(envelope) }; } }));
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_spirit_vein_view_help', { taskInput: '灵脉攻防战查看' }), 'ai-plugin');
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) { const result = run.value.data as any; assert.equal(result.success, false); assert.equal(result.result, undefined); assert.deepEqual(result.replies, row.envelope.data.middleware.replies); assert.equal(result.taskContinuation.outcome, 'next'); }
});
