import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeLingzhiStart$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_LINGZHI_START=([^|]+)\|(.+)/g)].map(match => ({ state: match[1], envelope: JSON.parse(match[2]) }));
assert.equal(fixtures.length, 4);

for (const fixture of fixtures) test(`灵药师开始指引：${fixture.state}`, async t => {
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/profession.lingzhi-guide');
    assert.equal(request.headers['x-bid'], 'player');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/加入灵药师');
    assert.deepEqual(body.arguments, { continued: false });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(fixture.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const invoke = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'start_herbalist_guide', {}), 'ai-plugin');
  const run = await invoke();
  assert.deepEqual(run.errors, []);
  assert.deepEqual(run.messages, []);
  assert.deepEqual(run.actions, []);
  assert.equal(run.value.ok, true);
  if (!run.value.ok) return;
  const result = run.value.data as any;
  assert.equal(result.success, fixture.envelope.data.success);
  assert.deepEqual(result.replies, fixture.envelope.data.middleware.replies);
  if (result.success) assert.deepEqual(result.result.session, fixture.envelope.data.data.session);
  else assert.equal(result.result, undefined);
  const retry = await invoke();
  assert.equal(retry.value.ok, true);
  if (retry.value.ok) assert.deepEqual(retry.value.data, run.value.data);
  assert.ok(keys[0]);
  assert.equal(keys[0], keys[1]);
});
test('灵药师入口拒绝身份注入和关闭配置', async () => {
  for (const mode of ['spoof', 'disabled', 'missing-id'] as const) {
    const app = createTestApp({ config: { 'xiuxian-game': { expose: { enabled: mode !== 'disabled' } } } });
    try {
      await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
      const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
      if (mode === 'missing-id') Object.assign(event, { MessageId: '', InteractionId: '' });
      const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'start_herbalist_guide', mode === 'spoof' ? { uid: 999 } : {}), 'ai-plugin');
      assert.deepEqual(result.errors, []);
      assert.equal(result.value.ok, false);
    } finally { await app.dispose(); }
  }
});

const transitionsOutput = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeLingzhiContinue$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const transitions = [...transitionsOutput.matchAll(/EXPOSE_LINGZHI_CONTINUE=([^|]+)\|(.+)/g)].map(match => ({ expected: JSON.parse(match[1]), envelope: JSON.parse(match[2]) }));
assert.equal(transitions.length, 4);
for (const row of transitions) test(`灵药师第 ${row.expected.step} 步：绑定原状态并保留实际结果`, async t => {
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(request.headers['x-bid'], 'player');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/继续灵药指引');
    assert.deepEqual(body.arguments, { continued: true, expected: row.expected });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(row.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const invoke = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'continue_herbalist_guide', { expected: row.expected }), 'ai-plugin');
  const run = await invoke();
  assert.deepEqual(run.errors, []);
  assert.deepEqual(run.messages, []);
  assert.deepEqual(run.actions, []);
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (!run.value.ok) return;
  const result = run.value.data as any;
  assert.equal(result.success, true);
  assert.deepEqual(result.result, row.envelope.data.data);
  const retry = await invoke();
  assert.equal(retry.value.ok, true);
  if (retry.value.ok) assert.deepEqual(retry.value.data, run.value.data);
  assert.ok(keys[0]);
  assert.equal(keys[0], keys[1]);
});

for (const mode of ['active', 'empty', 'malformed', 'disabled', 'spoof'] as const) test(`查询灵药师指引：${mode}`, async t => {
  const app = createTestApp({ config: { 'xiuxian-game': { expose: { enabled: mode !== 'disabled' }, backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: string[] = [];
  const session = transitions[0].expected;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const path = new URL(request.url).pathname;
    requests.push(path);
    assert.equal(request.method, 'GET');
    assert.equal(request.headers['x-bid'], 'player');
    if (path === '/api/v1/robot/identity') return { status: 200, headers: {}, data: JSON.stringify({ data: { bid: 'player', account: { status: 'registered', playerId: 7 } } }) };
    assert.equal(path, '/api/v1/players/7/professions/lingzhi/guide');
    const state = mode === 'empty' ? { completed: false } : mode === 'malformed' ? { completed: false, session: { ...session, version: 0 } } : { completed: false, session };
    return { status: 200, headers: {}, data: JSON.stringify({ data: state }) };
  } }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_herbalist_guide', mode === 'spoof' ? { uid: 99 } : {}), 'ai-plugin');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
  assert.equal(result.value.ok, mode === 'active' || mode === 'empty');
  if (result.value.ok) assert.deepEqual(result.value.data, mode === 'active' ? { active: true, session } : { active: false });
  assert.equal(requests.length, mode === 'disabled' || mode === 'spoof' ? 0 : 2);
});
