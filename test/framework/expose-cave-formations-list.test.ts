import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { fileURLToPath } from 'node:url';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('生效阵法列表保留服务端移除所需的原状态', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let data: any = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/cave-formations.list');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/洞府阵法'); assert.deepEqual(body.arguments, {});
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_active_cave_formations', {}), 'ai-plugin');
  let result = await call(); assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.deepEqual((result.value.data as any).result.formations, []);
  data = [{ formationKey: 'shield', formationCategory: 'defense', formationName: '护阵', formationEffect: '守护', expiresAt: '2026-10-31T00:00:00Z', categoryLabel: '防御', remainingText: '一天' }];
  result = await call(); assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.deepEqual((result.value.data as any).result.formations[0], { formationKey: 'shield', formationCategory: 'defense', formationName: '护阵', effectText: '守护', expiresAt: data[0].expiresAt, categoryLabel: '防御', remainingText: '一天' });
  delete data[0].expiresAt; result = await call(); assert.equal(result.value.ok, false);
});


test('阵法列表读取真实 Go 业务回执', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessCaveFormationsV1LifecycleAndReadOnly$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).toString();
  const rows = [...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=cave-formations\.list\|[^|]*\|[^|]*\|(.+)/g)].map(row => JSON.parse(row[1]));
  const fixture = rows.find(row => row.data.success && row.data.branch === 'business' && row.data.data?.length > 0);
  const refused = rows.find(row => !row.data.success);
  assert.ok(fixture && refused);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let reply = fixture; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(reply) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_active_cave_formations', {}), 'ai-plugin');
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) {
    const formations = (result.value.data as any).result.formations;
    assert.equal(formations.length, fixture.data.data.length);
    for (let i = 0; i < formations.length; i++) {
      assert.equal(formations[i].formationKey, fixture.data.data[i].formationKey);
      assert.equal(formations[i].expiresAt, fixture.data.data[i].expiresAt);
    }
  }
  reply = refused;
  const failed = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_active_cave_formations', {}), 'ai-plugin');
  assert.equal(failed.value.ok, true, JSON.stringify(failed.value));
  if (failed.value.ok) {
    assert.equal((failed.value.data as any).success, false);
    assert.equal((failed.value.data as any).result, undefined);
    assert.deepEqual((failed.value.data as any).replies, refused.data.middleware.replies);
  }
  assert.notEqual(keys[0], keys[1]);
});

test('阵法查询结果用于移除，刷新后保留服务端拒绝', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeFormationListToRemove$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
  const extract = (name: string) => { const match = output.match(new RegExp(`EXPOSE_FORMATION_CHAIN_${name}=(.+)`)); assert.ok(match); return JSON.parse(match[1]); };
  const list = extract('LIST'); const stale = extract('STALE'); const removed = extract('REMOVE');
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let reply = list; let expected: any;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    if (expected) assert.deepEqual(body.arguments, expected);
    return { status: 200, headers: {}, data: JSON.stringify(reply) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  const view = await call('get_active_cave_formations', {}); assert.equal(view.value.ok, true);
  if (!view.value.ok) return;
  const formation = (view.value.data as any).result.formations[0];
  const input = { keyword: formation.formationCategory, key: formation.formationKey, expiresAt: formation.expiresAt };
  expected = { keyword: input.keyword, expected: { key: input.key, expiresAt: input.expiresAt } };
  reply = stale; const refusal = await call('remove_cave_formation', input); assert.equal(refusal.value.ok, true);
  if (refusal.value.ok) { assert.equal((refusal.value.data as any).success, false); assert.equal((refusal.value.data as any).result, undefined); }
  reply = removed; const success = await call('remove_cave_formation', input); assert.equal(success.value.ok, true, JSON.stringify(success.value));
  if (success.value.ok) assert.equal((success.value.data as any).result.formation.formationKey, input.key);
});
