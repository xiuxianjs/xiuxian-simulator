import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessReferralActionsRewardsRollbackRepeatAndReplay$|^TestRobotBusinessReferralQueriesSyncReadProjectionAndReplay$|^TestRobotExposeReferralClaimTaskAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_REFERRAL_(?:ACTION|QUERY)_RESPONSE=([^|]+)\|([^|]+)\|player\|(.+)/g)].map(row => ({ operation: row[1], args: JSON.parse(row[2]), envelope: JSON.parse(row[3]) }));
const realClaimTask = JSON.parse(output.match(/EXPOSE_REFERRAL_CLAIM_TASK=(.+)/)![1]);
const entries = [
  { action: 'get_referral_overview', operation: 'referral.code', input: {}, command: '/邀请码' },
  { action: 'get_referral_invitees', operation: 'referral.invitees', input: { page: 1 }, command: '/我的邀请 1' },
  { action: 'bind_referral_code', operation: 'referral.bind', input: { code: ' tt-2 ' }, command: '/绑定邀请码  tt-2 ' },
  { action: 'claim_referral_rewards', operation: 'referral.claim', input: {}, command: '/领取邀请奖励' }
];
for (const entry of entries) test(`${entry.action}: 真实服务端结果和请求范围`, async t => {
  const fixture = fixtures.find(row => row.operation === entry.operation && JSON.stringify(row.args) === JSON.stringify(entry.input) && row.envelope.data.success && row.envelope.data.branch === 'business' && row.envelope.data.data?.outcome !== 'usage');
  assert.ok(fixture);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${entry.operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, entry.command);
    assert.deepEqual(body.arguments, entry.input);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(fixture.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', entry.action, entry.input), 'ai-plugin');
  const actual = await call();
  assert.equal(actual.value.ok, true, JSON.stringify(actual.value));
  if (actual.value.ok) {
    const data = (actual.value.data as any).result;
    if (entry.operation === 'referral.code') assert.equal(data.pendingRewards, 3);
    if (entry.operation === 'referral.invitees') assert.equal(data.items[0].userId, 2);
    if (entry.operation === 'referral.bind') assert.equal(data.issued[0].amount, 11);
    if (entry.operation === 'referral.claim') assert.equal(data.claimed, 2);
  }
  await call();
  if (entry.operation === 'referral.code' || entry.operation === 'referral.invitees') assert.notEqual(keys[0], keys[1]);
  else assert.equal(keys[0], keys[1]);
});

for (const entry of entries) test(`${entry.action}: 关闭及伪造身份均不可访问`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' }, expose: { enabled: false } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('unexpected HTTP'); });
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const spoof of [false, true]) {
    const response = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', entry.action, { ...entry.input, ...(spoof ? { uid: 2 } : {}) }), 'ai-plugin');
    assert.equal(response.value.ok, false);
    if (!response.value.ok) assert.equal(response.value.error.code, spoof ? 'INVALID_INPUT' : 'FORBIDDEN');
  }
});

for (const entry of entries.filter(item => item.operation === 'referral.bind' || item.operation === 'referral.claim')) test(`${entry.action}: 连锁任务保留真实业务回执`, async t => {
  const fixture = fixtures.find(row => row.operation === entry.operation && JSON.stringify(row.args) === JSON.stringify(entry.input) && row.envelope.data.success && row.envelope.data.branch === 'business' && row.envelope.data.data?.outcome === 'result');
  assert.ok(fixture);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const taskInput = entry.command.slice(1).trim().replace(/\s+/g, ' '); const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, entry.input); assert.equal(body.taskInput, taskInput); keys.push(request.headers['idempotency-key']);
    const envelope = structuredClone(entry.operation === 'referral.claim' ? realClaimTask : fixture.envelope);
    if (entry.operation === 'referral.bind') envelope.data.middleware.taskContinuation = { outcome: 'next', command: '我的邀请' };
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (input: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', entry.action, { ...entry.input, taskInput: input, intentId: 'referral-1' }), 'ai-plugin');
  const first = await call(taskInput); assert.equal(first.value.ok, true, JSON.stringify(first.value));
  if (first.value.ok) { const result = first.value.data as any; assert.equal(result.taskContinuation.outcome, 'next'); assert.ok(result.result.issued.length); }
  assert.equal((await call(taskInput)).value.ok, true); assert.equal(keys[0], keys[1]);
  assert.equal((await call(`${taskInput} 错误`)).value.ok, false); assert.equal(keys.length, 2);
});
