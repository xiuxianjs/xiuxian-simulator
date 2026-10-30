import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGiftCodesSettlementFallbackRemoteProtocolAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_GIFT_CODE_RESPONSE=gift-codes\.redeem\|player\|(.+)/g)].map(row => JSON.parse(row[1])).filter(row => !row.data.success || row.data.data?.outcome === 'result');
assert.ok(rows.some(row => row.data.success) && rows.some(row => !row.data.success));
test('礼包码兑换保留服务端奖励回执和拒绝', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/gift-codes.redeem');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { code: 'LIVEGIFT' }); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'redeem_gift_code', { code: ' live gift ' }), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    assert.equal(result.success, current.data.success);
    if (result.success && result.branch === 'business') {
      assert.equal(result.result.message, current.data.data.data.message);
      assert.deepEqual(result.result.rewardSummary, current.data.data.data.rewardSummary ?? []);
    } else assert.equal(result.result, undefined);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
});

test('礼包码任务步骤和操作重试保留兑换回执', async t => {
  const source = rows.find(row => row.data.success); assert.ok(source);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = []; let expected = '礼包码 LIVEGIFT';
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.taskInput, expected);
    assert.equal(body.messageText, `/${expected}`);
    assert.deepEqual(body.arguments, { code: 'LIVEGIFT' });
    keys.push(request.headers['idempotency-key']);
    const envelope = structuredClone(source); envelope.data.middleware.taskContinuation = { outcome: 'next', command: '我的邮件' };
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (taskInput: string, intentId = 'gift-1') => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'redeem_gift_code', { code: ' live gift ', taskInput, intentId }), 'ai-plugin');
  const first = await call('礼包码 LIVEGIFT'); assert.equal(first.value.ok, true, JSON.stringify(first.value));
  if (first.value.ok) { assert.equal((first.value.data as any).taskContinuation.outcome, 'next'); assert.equal((first.value.data as any).result.message, source.data.data.data.message); }
  assert.equal((await call('礼包码 LIVEGIFT')).value.ok, true); assert.equal(keys[0], keys[1]);
  expected = '礼品码 live gift';
  assert.equal((await call(expected, 'gift-2')).value.ok, true);
  assert.notEqual(keys[1], keys[2]);
  assert.equal((await call('礼包码 OTHER')).value.ok, false);
  assert.equal((await call('兑换码 LIVEGIFT')).value.ok, false);
  assert.equal(keys.length, 3);
});
