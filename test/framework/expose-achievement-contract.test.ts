import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeAchievementContracts$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 24 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_ACHIEVEMENT_HTTP=(.+)/g)].map(match => JSON.parse(match[1]));
const actions = ['get_achievement_overview', 'get_achievement_category', 'get_all_achievements', 'get_completed_achievements', 'get_combat_power_achievements', 'claim_combat_power_achievements', 'get_titles', 'activate_title', 'deactivate_title'];
for (const action of actions) test(`${action}: 真实服务端状态与结算回执`, async t => {
  const rows = fixtures.filter(row => row.action === action);
  assert.ok(rows.length > 0);
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  const requests: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request);
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    assert.equal(request.headers['x-bid'], 'player');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, current.command);
    assert.deepEqual(body.arguments, current.args);
    assert.equal(body.taskInput, undefined);
    assert.ok([...body.messageText].length <= 80);
    return { status: current.status, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  let succeeded = 0;
  let refused = 0;
  for (current of rows) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const originalText = event.MessageText;
    const invoke = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, current.input), 'ai-plugin');
    const run = await invoke();
    assert.deepEqual(run.errors, []);
    assert.deepEqual(run.messages, []);
    assert.deepEqual(run.actions, []);
    assert.equal(event.MessageText, originalText);
    assert.equal(run.value.ok, current.status === 200, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const actual = run.value.data as any;
    const server = current.envelope.data;
    assert.equal(actual.success, server.success);
    assert.deepEqual(actual.replies, server.middleware.replies);
    if (!server.success) { refused++; assert.equal(actual.result, undefined); continue; }
    succeeded++;
    const data = server.data;
    const clean = (value: any): any => Array.isArray(value) ? value.map(clean) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null).map(([k, v]) => [k, clean(v)])) : value;
    if (action === 'get_achievement_overview' || action === 'get_achievement_category') {
      assert.deepEqual(actual.result, clean(data));
    } else if (action === 'get_all_achievements') {
      assert.deepEqual(actual.result, clean(data));
    } else if (action === 'get_completed_achievements' || action === 'get_combat_power_achievements' || action === 'claim_combat_power_achievements') {
      assert.equal(actual.result.locked, !data.access.canUseFifthLayerFeature);
      if (actual.result.locked) { assert.equal(actual.result.realmName, data.access.realmName); assert.equal(actual.result.data, undefined); }
      else if (action === 'claim_combat_power_achievements') {
        assert.equal(actual.result.data.claimedCount, data.data.claimedCount);
        assert.equal(actual.result.data.claimed.length, data.data.claimed.length);
        assert.equal(actual.result.data.claimed[0].achievementName, data.data.claimed[0].achievementName);
        assert.equal(actual.result.data.claimed[0].rewardText, '灵石×5');
      } else assert.deepEqual(actual.result.data, clean(data.data));
    } else if (action === 'get_titles') {
      assert.deepEqual(actual.result, clean(data));
      assert.ok(actual.result.titles.every((row: any) => row.id !== 202 && row.id !== 303));
    } else if (action === 'activate_title') {
      assert.deepEqual(actual.result, data);
      assert.equal(actual.result.id, current.input.titleId);
      assert.equal(actual.result.isActive, true);
    } else assert.deepEqual(actual.result, data);
    const again = await invoke();
    assert.equal(again.value.ok, true);
    assert.deepEqual(again.value.ok && again.value.data, run.value.data);
    assert.ok(requests.at(-1).headers['idempotency-key']);
    assert.equal(requests.at(-1).headers['idempotency-key'], requests.at(-2).headers['idempotency-key']);
  }
  assert.ok(succeeded > 0);
  if (action === 'deactivate_title') assert.ok(rows.some(row => row.envelope.data.data?.removed === false));
});

for (const action of actions) for (const mode of ['disabled', 'spoof', 'missing-id', 'cancel', 'malformed'] as const) test(`${action}: ${mode}`, async t => {
  const fixture = fixtures.find(row => row.action === action && row.status === 200 && row.envelope.data.success);
  assert.ok(fixture?.envelope.data.success);
  const app = createTestApp({ config: { 'xiuxian-game': { expose: { enabled: mode !== 'disabled' }, backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let calls = 0;
  const controller = new AbortController();
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++;
    if (mode === 'cancel') return new Promise((_resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
      controller.abort();
    });
    const envelope = structuredClone(fixture.envelope);
    if (mode === 'malformed') envelope.data.data = {};
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  if (mode === 'missing-id') Object.assign(event, { MessageId: '', InteractionId: '' });
  const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, mode === 'spoof' ? { ...fixture.input, uid: 999 } : fixture.input, { signal: controller.signal }), 'ai-plugin');
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.ok, false);
  assert.equal(calls, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 0 : 1);
  if (!result.value.ok) assert.equal(result.value.error.outcome, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 'not_started' : 'unknown');
});
for (const [action, input] of [
  ['activate_title', { titleId: 0 }], ['activate_title', { titleId: 1.5 }],
  ['activate_title', { titleId: Number.MAX_SAFE_INTEGER + 1 }],
  ['get_all_achievements', { page: 0 }], ['get_completed_achievements', { page: -1 }],
  ['get_achievement_category', { category: 'combat_power 领取' }], ['get_achievement_category', { category: 'fake' }],
  ['claim_combat_power_achievements', { uid: 999 }]
] as const) test(`${action}: 拒绝无效输入 ${JSON.stringify(input)}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('invalid input must not reach HTTP'); });
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, false);
  if (!run.value.ok) assert.equal(run.value.error.code, 'INVALID_INPUT');
});
