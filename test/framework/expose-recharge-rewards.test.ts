import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusiness(RechargeQueriesV1ReadOnly|FirstRechargeClaimV1ParityAndRepeat|NewcomerRechargeClaimV1ParityAndRepeat|WeeklyRebateClaimV1ParityAndReplay)$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
}).toString();
const rows = (tag: string) => [...output.matchAll(new RegExp(`${tag}=(.+)`, 'g'))].map(match => JSON.parse(match[1]));
const queries = rows('ROBOT_RECHARGE_QUERY');
const cases = [
  { action: 'get_first_recharge_rewards', op: 'recharge.first-info', command: '/礼包奖励', rows: queries.filter(row => row.kind === 'first'), input: () => ({}) },
  { action: 'get_newcomer_recharge_rebate', op: 'recharge.newcomer-info', command: '/新人返利', rows: queries.filter(row => row.kind === 'newcomer'), input: () => ({}) },
  { action: 'get_weekly_recharge_rebate', op: 'recharge.weekly-info', command: '/周周返利', rows: queries.filter(row => row.kind === 'weekly'), input: () => ({}) },
  { action: 'claim_first_recharge_reward', op: 'recharge.first-claim', command: '/领取礼包奖励 1', rows: rows('ROBOT_FIRST_RECHARGE_CLAIM').filter(row => row.yuan === 1), input: () => ({ tierYuan: 1 }) },
  { action: 'claim_newcomer_recharge_rebate', op: 'recharge.newcomer-claim', command: '/新人返利领取 1', rows: rows('ROBOT_NEWCOMER_RECHARGE_CLAIM').filter(row => row.day === 1), input: () => ({ dayIndex: 1 }) },
  { action: 'claim_weekly_recharge_rebate', op: 'recharge.weekly-rebate-claim', command: '/周周返利领取 1', rows: rows('ROBOT_WEEKLY_REBATE_CLAIM').filter(row => row.day === 1), input: () => ({ dayIndex: 1 }) }
];
for (const item of cases) test(`${item.action}: 使用服务端真实回执`, async t => {
  assert.ok(item.rows.length > 0);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = item.rows[0];
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${item.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, item.command);
    assert.deepEqual(body.arguments, item.action.startsWith('claim_') ? { input: item.command } : {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify({ data: current.result }) };
  } }));
  for (current of item.rows) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', item.action, item.input()), 'ai-plugin');
    const run = await call();
    assert.deepEqual(run.errors, []);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    assert.equal(result.success, current.result.success);
    assert.deepEqual(result.replies, current.result.middleware.replies);
    if (!current.result.success || current.result.branch !== 'business') assert.equal(result.result, undefined);
    else assert.ok(result.result);
    await call();
    if (item.action.startsWith('claim_')) assert.equal(keys.at(-1), keys.at(-2));
    else assert.notEqual(keys.at(-1), keys.at(-2));
  }
});
