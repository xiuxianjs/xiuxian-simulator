import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('按编号读取同名秘境详情并隔离不同目标', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessDungeonQueriesV1ParityReadOnlyAndReplay$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
  }).toString();
  const rows = [...output.matchAll(/ROBOT_DUNGEON_QUERY_RESPONSE=dungeon\.detail\|player\|(.+)/g)].map(row => JSON.parse(row[1]));
  const first = rows.find(row => row.data.success && row.data.data?.data?.id === 9 && row.data.data.data.spiritCost === 8);
  const second = rows.find(row => row.data.success && row.data.data?.data?.id === 10 && row.data.data.data.spiritCost === 19);
  assert.ok(first && second);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = first;
  let expected = 9;
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/dungeon.detail');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { dungeonId: expected });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (dungeonId: number) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_dungeon_detail_by_id', { dungeonId }), 'ai-plugin');
  const one = await call(9);
  assert.equal(one.value.ok, true, JSON.stringify(one.value));
  if (one.value.ok) assert.equal((one.value.data as any).result.spiritCost, 8);
  current = second; expected = 10;
  const two = await call(10);
  assert.equal(two.value.ok, true, JSON.stringify(two.value));
  if (two.value.ok) assert.equal((two.value.data as any).result.spiritCost, 19);
  const repeated = await call(10);
  assert.equal(repeated.value.ok, true, JSON.stringify(repeated.value));
  assert.notEqual(keys[1], keys[2]);
  current = first;
  const mismatch = await call(10);
  assert.equal(mismatch.value.ok, false);
  const invalid = await call(0);
  assert.equal(invalid.value.ok, false);
  assert.equal(keys.length, 4);
});

test('按目录编号挑战秘境并核对结算目标', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessDungeonChallengeSettlementRollbackAndReplay/win$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
  }).toString();
  const rows = [...output.matchAll(/ROBOT_DUNGEON_CHALLENGE_RESPONSE=dungeon\.challenge\|player\|(.+)/g)].map(row => JSON.parse(row[1]));
  const fixture = rows.find(row => row.data.success && row.data.data?.outcome === 'result' && row.data.data.data.dungeonId === 1);
  assert.ok(fixture);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let envelope = structuredClone(fixture);
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/dungeon.challenge');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { mode: 'challenge', dungeonId: 1 });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'challenge_dungeon_by_id', input), 'ai-plugin');
  const result = await call({ dungeonId: 1 });
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.equal((result.value.data as any).result.dungeonId, 1);
  const retry = await call({ dungeonId: 1 });
  assert.equal(retry.value.ok, true, JSON.stringify(retry.value));
  assert.equal(keys[0], keys[1]);
  envelope = structuredClone(fixture);
  envelope.data.data.data.dungeonId = 2;
  const mismatch = await call({ dungeonId: 1 });
  assert.equal(mismatch.value.ok, false);
  const invalid = await call({ dungeonId: 0 });
  assert.equal(invalid.value.ok, false);
  assert.equal(keys.length, 3);
});

test('按目录编号扫荡秘境并保留实际次数和结算', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessDungeonSweepsSettlementPartialAndReplay/single$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
  }).toString();
  const rows = [...output.matchAll(/ROBOT_DUNGEON_SWEEP_RESPONSE=dungeon\.sweep\|player\|(.+)/g)].map(row => JSON.parse(row[1]));
  const fixture = rows.find(row => row.data.success && row.data.data?.dungeonId === 1 && row.data.data?.outcome === 'result');
  assert.ok(fixture);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let envelope = structuredClone(fixture);
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/dungeon.sweep');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { mode: 'sweep', dungeonId: 1, times: 10 });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'sweep_dungeon_by_id', input), 'ai-plugin');
  const result = await call({ dungeonId: 1, times: 10 });
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) {
    assert.equal((result.value.data as any).result.dungeonId, 1);
    assert.equal((result.value.data as any).result.result.times, fixture.data.data.data.times);
  }
  const retry = await call({ dungeonId: 1, times: 10 });
  assert.equal(retry.value.ok, true, JSON.stringify(retry.value));
  assert.equal(keys[0], keys[1]);
  envelope = structuredClone(fixture);
  envelope.data.data.dungeonId = 2;
  const mismatch = await call({ dungeonId: 1, times: 10 });
  assert.equal(mismatch.value.ok, false);
  for (const input of [{ dungeonId: 0, times: 10 }, { dungeonId: 1, times: 2 }]) assert.equal((await call(input)).value.ok, false);
  assert.equal(keys.length, 3);
});

test('一键免费扫荡返回同名秘境各自编号及部分失败', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessDungeonSweepsSettlementPartialAndReplay/free-detailed$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
  }).toString();
  const rows = [...output.matchAll(/ROBOT_DUNGEON_SWEEP_RESPONSE=dungeon\.sweep-free-detailed\|player\|(.+)/g)].map(row => JSON.parse(row[1]));
  const fixture = rows.find(row => row.data.success && row.data.data?.sweptDungeons?.length === 2 && row.data.data?.skippedDungeons?.length === 2);
  const noSweep = rows.find(row => row.data.success && row.data.data?.status === 'none' && row.data.data?.skippedDungeons?.length === 5);
  assert.ok(fixture && noSweep);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let envelope = structuredClone(fixture);
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/dungeon.sweep-free-detailed');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'sweep_free_dungeons_with_ids', {}), 'ai-plugin');
  const run = await call();
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) {
    const result = (run.value.data as any).result;
    assert.deepEqual(result.sweptDungeons.map((item: any) => item.dungeonId), [1, 2]);
    assert.equal(result.sweptDungeons[0].dungeonName, result.sweptDungeons[1].dungeonName);
    assert.deepEqual(result.skippedDungeons.map((item: any) => item.dungeonId), [3, 4]);
    assert.equal(result.totalSpiritCost, 0);
    assert.equal(result.status, 'partial');
    assert.equal(result.stopped, true);
  }
  const retry = await call();
  assert.equal(retry.value.ok, true, JSON.stringify(retry.value));
  assert.equal(keys[0], keys[1]);
  envelope = structuredClone(fixture);
  envelope.data.data.sweptDungeons[1].dungeonId = 1;
  const malformed = await call();
  assert.equal(malformed.value.ok, false);
  envelope = structuredClone(noSweep);
  const none = await call();
  assert.equal(none.value.ok, true, JSON.stringify(none.value));
  if (none.value.ok) {
    const result = (none.value.data as any).result;
    assert.equal(result.status, 'none');
    assert.equal(result.stopped, false);
    assert.deepEqual(result.sweptDungeons, []);
    assert.deepEqual(result.skippedDungeons.map((item: any) => item.dungeonId), [1, 2, 3, 4, 5]);
  }
});
