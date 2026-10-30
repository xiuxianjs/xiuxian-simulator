import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessMembershipQueriesClaimAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).toString();
const fixtures = [...output.matchAll(/ROBOT_MEMBERSHIP_RESPONSE=(membership\.(?:rights|privileges))\|player\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
assert.ok(fixtures.length >= 4);
for (const [i, fixture] of fixtures.entries()) test(`权益回执 ${i + 1}: ${fixture.op}`, async t => {
  const rights = fixture.op === 'membership.rights';
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${fixture.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, rights ? '/我的权益' : '/我的特权');
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(fixture.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', rights ? 'get_membership_rights' : 'get_membership_privileges', {}), 'ai-plugin');
  const response = await call();
  assert.equal(response.value.ok, true, JSON.stringify(response.value));
  if (response.value.ok) {
    const actual = response.value.data as any;
    const expected = fixture.envelope.data;
    assert.equal(actual.success, expected.success);
    if (actual.success) {
      assert.equal(actual.result.vipLevel, expected.data.vipLevel);
      assert.equal(actual.result.totalRechargeAmount, expected.data.totalRechargeAmount);
      if (rights) {
        assert.equal(actual.result.monthCard.active, expected.data.monthCard.active);
        assert.equal(actual.result.monthCard.daily.claimableCount, expected.data.monthCard.daily.claimableCount);
      } else assert.deepEqual(actual.result.vipPrivileges, expected.data.vipPrivileges);
    } else assert.equal(actual.result, undefined);
  }
  await call();
  assert.notEqual(keys[0], keys[1]);
});


test('权益任务步骤保留原服务端查询数据', async t => {
  const source = fixtures.find(row => row.op === 'membership.rights' && row.envelope.data.success)!.envelope; assert.ok(source);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    const envelope = structuredClone(source);
    if (body.taskInput) envelope.data.middleware.taskContinuation = { outcome: 'next', command: '我的资料' };
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const ordinary = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_membership_rights', {}), 'ai-plugin');
  const task = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_membership_rights', { taskInput: '我的权益' }), 'ai-plugin');
  assert.ok(ordinary.value.ok && task.value.ok);
  assert.deepEqual((task.value.data as any).result, (ordinary.value.data as any).result);
  assert.deepEqual((task.value.data as any).taskContinuation, { outcome: 'next', command: '我的资料' });
});
