import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeNewcomerContracts$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_NEWCOMER=([^|]+)\|([^|]+)\|(.+)/g)].map(match => ({ action: match[1], input: JSON.parse(match[2]), envelope: JSON.parse(match[3]) }));
assert.equal(fixtures.length, 8);
const milestones = (result: any) => result.detailDays.flatMap((day: any) => day.tasks.flatMap((task: any) => task.milestones));
for (const action of ['get_newcomer_activity', 'claim_newcomer_login', 'claim_newcomer_task']) test(`${action}: 服务端活动状态与实际回执`, async t => {
  const rows = fixtures.filter(row => row.action === action);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const expected = action === 'get_newcomer_activity' ? 'newcomer-activity.overview' : action === 'claim_newcomer_login' ? 'checkin.newcomer-login' : 'newcomer-activity.claim-task';
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${expected}`);
    assert.equal(request.headers['x-bid'], 'player');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.input);
    assert.equal(body.messageText, action === 'get_newcomer_activity' ? '/初入仙途' : action === 'claim_newcomer_login' ? '/初入仙途签到' : `/新人任务领取 ${current.input.taskConfigId}`);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const outcomes = new Set<string>();
  for (current of rows) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, current.input), 'ai-plugin');
    const run = await call();
    assert.deepEqual(run.errors, []);
    assert.deepEqual(run.messages, []);
    assert.deepEqual(run.actions, []);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    const server = current.envelope.data;
    assert.equal(result.success, server.success);
    assert.deepEqual(result.replies, server.middleware.replies);
    if (!server.success) { assert.equal(result.result, undefined); outcomes.add('refused'); continue; }
    if (action === 'get_newcomer_activity') {
      assert.equal(result.result.currentDayIndex, server.data.currentDayIndex);
      const source = milestones(server.data);
      const projected = milestones(result.result);
      assert.equal(projected.length, source.length);
      for (let index = 0; index < source.length; index++) {
        const match = source[index].command?.match(/^\/新人任务领取 ([1-9]\d*)$/);
        assert.equal(projected[index].status, source[index].status);
        assert.equal(projected[index].taskConfigId, match ? Number(match[1]) : undefined);
        assert.equal(projected[index].command, undefined);
      }
      outcomes.add('view');
    } else {
      assert.deepEqual(result.result, server.data);
      outcomes.add(action === 'claim_newcomer_login' ? server.data.code : `${server.data.spiritCrystal}/${server.data.vipExpYuan}`);
    }
    const retry = await call();
    assert.equal(retry.value.ok, true);
    if (retry.value.ok) assert.deepEqual(retry.value.data, run.value.data);
    if (action === 'get_newcomer_activity') assert.notEqual(keys.at(-1), keys.at(-2));
    else assert.equal(keys.at(-1), keys.at(-2));
  }
  if (action === 'claim_newcomer_task') for (const expected of ['refused', '5/6', '0/0']) assert.ok(outcomes.has(expected));
  if (action === 'claim_newcomer_login') for (const expected of ['OK', 'NO_CLAIMABLE']) assert.ok(outcomes.has(expected));
});

test('同一消息领取后再次查看新人面板并重试原领奖', async t => {
  const views = fixtures.filter(row => row.action === 'get_newcomer_activity');
  const claim = fixtures.find(row => row.action === 'claim_newcomer_task' && row.input.taskConfigId === 21 && row.envelope.data.success);
  assert.equal(views.length, 2);
  assert.ok(claim);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const receipts = new Map<string, any>();
  let claimed = false;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const key = request.headers['idempotency-key'];
    let envelope = receipts.get(key);
    if (!envelope) {
      if (new URL(request.url).pathname.endsWith('/newcomer-activity.claim-task')) { claimed = true; envelope = claim.envelope; }
      else envelope = views[claimed ? 1 : 0].envelope;
      receipts.set(key, envelope);
    }
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = async (action: string, input: any) => {
    const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    return result.value.ok ? result.value.data as any : undefined;
  };
  const original = milestones((await call('get_newcomer_activity', {})).result).find((row: any) => row.taskConfigId === 21 && row.status === 'CLAIMABLE');
  assert.ok(original);
  const received = await call('claim_newcomer_task', { taskConfigId: 21 });
  assert.ok(milestones((await call('get_newcomer_activity', {})).result).some((row: any) => row.text === original.text && row.status === 'CLAIMED'));
  assert.deepEqual(await call('claim_newcomer_task', { taskConfigId: 21 }), received);
  assert.equal(receipts.size, 3);
});

for (const [action, mode, input] of [
  ['get_newcomer_activity', 'disabled', {}],
  ['claim_newcomer_login', 'disabled', {}],
  ['claim_newcomer_task', 'disabled', { taskConfigId: 21 }],
  ['claim_newcomer_task', 'invalid', { taskConfigId: 0 }],
  ['claim_newcomer_task', 'invalid', { taskConfigId: 1.5 }],
  ['claim_newcomer_task', 'invalid', { taskConfigId: 21, uid: 99 }]
] as const) test(`${action}: ${mode} 不请求服务端`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { expose: { enabled: mode !== 'disabled' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('unexpected HTTP'); });
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, false);
});
