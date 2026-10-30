import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotPVPExposeQueries|TestRobotPVPExposeSparBatch|TestRobotExposeSparTaskAndReplay|TestRobotBusinessSparV1WinLossMentionAndRollback|TestRobotBusinessPVPRecordsV1PaginationAndAcknowledgement|TestRobotBusinessPVPKillGodClaimTransactionAndV1)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const pvp = [...output.matchAll(/ROBOT_PVP_RESPONSE=([^|]+)\|[^|]+\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
const records = [...output.matchAll(/ROBOT_RECORDS_RESPONSE=([^|]+)\|[^|]+\|(.+)/g)].map(row => JSON.parse(row[2]));
const spar = [...output.matchAll(/ROBOT_SPAR_RESPONSE=([^|]+)\|[^|]+\|(.+)/g)].map(row => JSON.parse(row[2]));
const tasks = [...output.matchAll(/EXPOSE_SPAR_TASK=([^|]+)\|(.+)/g)].map(row => ({ command: row[1], envelope: JSON.parse(row[2]) }));

test('单次与十连比试使用真实任务推进及战斗回执', async t => {
  assert.equal(tasks.length, 2);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = tasks[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.taskInput, current.command);
    assert.deepEqual(body.arguments, current.command.startsWith('十连') ? { targetUid: '2', batch: true } : { targetUid: '2' });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of tasks) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'spar_with_player', { targetUid: 2, batch: current.command.startsWith('十连'), taskInput: current.command, intentId: current.command.startsWith('十连') ? 'batch' : 'single' }), 'ai-plugin');
    const run = await call(); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) { const data = run.value.data as any; assert.equal(data.taskContinuation.outcome, 'next'); assert.equal(data.result.targetUid, 2); }
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
});

test('比试、战报、仇人和杀神榜保留服务端事实', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let args: any = {}; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [operation, action, read] of [
    ['pvp.sha-qi', 'get_sha_qi', true], ['pvp.enemies', 'get_enemies', true],
    ['pvp.kill-god-ranking', 'get_kill_god_ranking', true], ['pvp.kill-god-title-claim', 'claim_kill_god_title', false]
  ] as const) {
    op = operation; args = {}; envelope = pvp.find(row => row.op === op && row.envelope.data.success && row.envelope.data.branch === 'business')?.envelope; assert.ok(envelope, op);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, {}), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    if (result.value.ok && action === 'get_enemies') assert.equal((result.value.data as any).result.enemies[0].lastLogId, 9);
    if (result.value.ok && action === 'claim_kill_god_title') assert.equal((result.value.data as any).result.code, 'OK');
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
  }
  op = 'pvp.records'; args = { page: 1 }; envelope = records.find(row => row.data.success && row.data.branch === 'business' && row.data.data.records.length > 0); assert.ok(envelope);
  const history = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_robbery_records', {}), 'ai-plugin');
  assert.equal(history.value.ok, true, JSON.stringify(history.value));
  if (history.value.ok) assert.equal((history.value.data as any).result.records[0].id, envelope.data.data.records[0].id);
  op = 'pvp.spar'; args = { targetUid: '2' }; envelope = spar.find(row => row.data.success && row.data.data?.battle); assert.ok(envelope);
  const fight = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'spar_with_player', { targetUid: 2 }), 'ai-plugin');
  const result = await fight(); assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.equal((result.value.data as any).result.targetUid, 2);
  await fight(); assert.equal(keys.at(-1), keys.at(-2));
  const fightIntent = (intentId: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'spar_with_player', { targetUid: 2, intentId }), 'ai-plugin');
  assert.equal((await fightIntent('first')).value.ok, true); const firstKey = keys.at(-1);
  assert.equal((await fightIntent('first')).value.ok, true); assert.equal(keys.at(-1), firstKey);
  assert.equal((await fightIntent('second')).value.ok, true); assert.notEqual(keys.at(-1), firstKey);
  args = { targetUid: '2', batch: true };
  envelope = spar.find(row => row.data.success && row.data.data?.battle?.settledCount > 1); assert.ok(envelope);
  const batch = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'spar_with_player', { targetUid: 2, batch: true }), 'ai-plugin');
  assert.equal(batch.value.ok, true, JSON.stringify(batch.value));
  if (batch.value.ok) assert.equal((batch.value.data as any).result.settledCount, envelope.data.data.battle.settledCount);

});
