import { mockBackendConfig } from './backend-config-helper';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import axios from 'axios';
import { backendRequestTimeout, UNKNOWN_BATTLE_RESULT } from '../src/api/bot/battle-request';
import { requestBackend } from '../src/api/bot/client';
import { getCommandErrorMessage } from '../src/utils/commandError';
import worldBossApp from '../src/response-apps/worldBoss/challenge/app';

test('battle budgets preserve longer configured timeouts and query budgets', () => {
  assert.equal(backendRequestTimeout('post_players_id_realm_promotion', 10000), 60000);
  assert.equal(backendRequestTimeout('post_players_id_world_boss_challenge_all', 10000), 120000);
  assert.equal(backendRequestTimeout('post_players_id_dungeons_sweep_free', 10000), 120000);
  assert.equal(backendRequestTimeout('post_players_id_tongtian_tower_batch_challenges', 180000), 180000);
  assert.equal(backendRequestTimeout('get_players_id_world_boss_info_query', 10000), 10000);
});

function configure(t: TestContext) {
  mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token', api_timeout_ms: 10000 });
}

test('continuous battle waits for settlement and never retries the write', async t => {
  configure(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal: AbortSignal | undefined;
  let calls = 0;
  let finish!: (value: unknown) => void;
  t.mock.method(axios, 'create', () => ({request(options: {signal: AbortSignal; headers: Record<string,string>}) {
    calls++; signal = options.signal;
    assert.equal(new Headers(options.headers).get('Idempotency-Key'), 'battle-message');
    return new Promise(resolve => { finish = resolve; });
  }}));
  const pending = requestBackend('bid', 'post_players_id_world_boss_challenge_all', {path: {id: 1}, body: {}, idempotencyKey: 'battle-message'});
  t.mock.timers.tick(65000);
  assert.equal(signal?.aborted, false);
  finish({status: 200, headers: {}, data: JSON.stringify({data: {attemptsUsed: 1, stopReason: '后续挑战已停止'}})});
  assert.deepEqual(await pending, {attemptsUsed: 1, stopReason: '后续挑战已停止'});
  assert.equal(calls, 1);
});

test('uncertain battle timeout survives global error formatting without retry', async t => {
  configure(t);
  t.mock.timers.enable({apis: ['setTimeout']});
  let calls = 0;
  t.mock.method(axios, 'create', () => ({request(options: {signal: AbortSignal}) {
    calls++;
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), {once: true}));
  }}));
  const pending = requestBackend('bid', 'post_players_id_realm_promotion', {path: {id: 1}, body: {}, idempotencyKey: 'promotion-message'});
  t.mock.timers.tick(60000);
  await assert.rejects(pending, error => {
    assert.equal(getCommandErrorMessage(error), UNKNOWN_BATTLE_RESULT);
    return true;
  });
  assert.equal(calls, 1);
});

test('battle business failures keep their messages and infrastructure errors are sanitized', async t => {
  configure(t);
  let status = 409;
  let payload = {error: {code: 'CONFLICT', message: '精力不足（需要100，当前65）'}};
  t.mock.method(axios, 'create', () => ({request: async () => ({status, headers: {}, data: JSON.stringify(payload)})}));
  const invoke = () => requestBackend('bid', 'post_players_id_realm_promotion', {path: {id: 1}, body: {}, idempotencyKey: 'promotion-message'});
  await assert.rejects(invoke(), error => { assert.equal((error as Error).message, payload.error.message); return true; });
  status = 500;
  payload = {error: {code: 'INTERNAL', message: 'Table secret does not exist'}};
  await assert.rejects(invoke(), error => { assert.equal((error as Error).message, '服务暂时不可用，请稍后再试'); return true; });
});

test('one completed round remains a visible partial batch receipt', async t => {
  configure(t);
  const round = {
    damageDealt: 5, totalPlayerDamage: 5, attackCount: 1, remainingAttempts: 1, rank: null,
    battle: {Winner: 'A', Rounds: 1, SideA: [], SideB: []},
    battleSummary: {sideACount: 1, sideBCount: 1, totalDamageA: 5, totalDamageB: 0, totalHealsA: 0, totalHealsB: 0},
    logId: 'battle-log', stageName: '炼气', bossTitle: '凶', bossName: '测试兽'
  };
  let calls = 0;
  t.mock.method(axios, 'create', () => ({request: async () => {
    calls++;
    return {status: 200, headers: {}, data: JSON.stringify({data: {
      rounds: [round], lastRound: round, attemptsUsed: 1, totalDamageDealt: 5,
      stageName: '炼气', bossTitle: '凶', bossName: '测试兽', remainingAttempts: 1, stopReason: '后续挑战已停止'
    }})};
  }}));
  const result = await worldBossApp({bid: 'bid', uid: 1, useAllAttempts: true, request: {requestId: 'request', idempotencyKey: 'batch-message'}});
  assert.equal(result.code, 'OK');
  if (result.code !== 'OK') return;
  assert.equal(result.data.batchMode, true);
  assert.equal(result.data.attemptsUsed, 1);
  assert.equal(result.data.totalDamageDealt, 5);
  assert.equal(result.data.remainingAttempts, 1);
  assert.equal(result.data.stopReason, '后续挑战已停止');
  assert.equal(calls, 1);
});
