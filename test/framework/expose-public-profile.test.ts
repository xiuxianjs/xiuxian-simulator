import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessPublicProfileTargetPrivacyAndAdmission$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_PUBLIC_PROFILE_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(match => ({ args: JSON.parse(match[1]), bid: match[2], envelope: JSON.parse(match[3]) }));

test('公开玩家资料遵循服务端隐私及目标编号', async t => {
  const sources = [
    { uid: 2, row: rows.find(row => row.bid === 'player' && row.args.target?.uid === 2 && row.envelope.data.branch === 'business') },
    { uid: 3, row: rows.find(row => row.bid === 'player' && row.args.target?.bid === 'hidden' && row.envelope.data.branch === 'business') },
    { uid: 404, row: rows.find(row => row.bid === 'player' && row.args.target?.uid === 404) }
  ];
  assert.ok(sources.every(item => item.row));
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = sources[0]; let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/profile.view');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, `/查看信息 ${current.uid}`);
    assert.deepEqual(body.arguments, { target: { uid: current.uid } });
    return { status: 200, headers: {}, data: JSON.stringify(current.row!.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of sources) {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_public_player_profile', { targetUid: current.uid }), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = (run.value.data as any).result;
    const original = current.row!.envelope.data.data;
    assert.equal(result.found, original.found);
    assert.equal(result.hideProfile, original.hideProfile);
    if (current.uid === 2) { assert.equal(result.profile.uid, 2); assert.deepEqual(result.detail, original.detail); }
    if (current.uid === 3) { assert.equal(result.profile.uid, 3); assert.equal(result.hideProfile, true); assert.equal(result.detail, undefined); }
    if (current.uid === 404) { assert.equal(result.found, false); assert.equal(result.profile, undefined); }
  }
  const before = calls;
  const invalid = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_public_player_profile', { targetUid: 0 }), 'ai-plugin');
  assert.equal(invalid.value.ok, false); assert.equal(calls, before);
});

test('平台标识查询以当前用户为主体并保留隐私和未注册回执', async t => {
  const targets = ['target', 'hidden', 'not-registered'];
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let target = targets[0]; let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++;
    assert.equal(request.headers['x-bid'], 'player');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/查看信息'); assert.deepEqual(body.arguments, { target: { bid: target } });
    const row = rows.find(item => item.bid === 'player' && item.args.target?.bid === target && item.envelope.data.branch === 'business');
    assert.ok(row);
    return { status: 200, headers: {}, data: JSON.stringify(row.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (targetBid: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_public_player_profile_by_platform_id', { targetBid }), 'ai-plugin');
  for (target of targets) {
    const run = await call(target); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const data = run.value.data as any;
    if (target === 'not-registered') { assert.equal(data.success, false); assert.equal(data.result, undefined); }
    else { assert.equal(data.success, true); assert.equal(data.result.profile.uid, target === 'target' ? 2 : 3); if (target === 'hidden') assert.equal(data.result.detail, undefined); }
  }
  const before = calls;
  for (const invalid of ['', ' target', 'target,hidden', '中文']) assert.equal((await call(invalid)).value.ok, false);
  assert.equal(calls, before);
});

test('公开资料目标不符或隐藏资料含属性时拒绝返回', async t => {
  const visible = rows.find(item => item.bid === 'player' && item.args.target?.uid === 2 && item.envelope.data.success && item.envelope.data.branch === 'business');
  const hidden = rows.find(item => item.bid === 'player' && item.args.target?.bid === 'hidden' && item.envelope.data.success && item.envelope.data.branch === 'business');
  assert.ok(visible && hidden);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let envelope = structuredClone(visible.envelope);
  envelope.data.data.profile.uid = 3;
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify(envelope) }) }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (action: string, input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.equal((await call('get_public_player_profile', { targetUid: 2 })).value.ok, false);
  envelope = structuredClone(hidden.envelope);
  envelope.data.data.detail = structuredClone(visible.envelope.data.data.detail);
  for (const [action, input] of [['get_public_player_profile', { targetUid: 3 }], ['get_public_player_profile_by_platform_id', { targetBid: 'hidden' }]] as const) {
    assert.equal((await call(action, input)).value.ok, false);
  }
});
