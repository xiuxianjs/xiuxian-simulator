import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeGuildMembershipContracts$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_GUILD_MEMBERSHIP_HTTP=(.+)/g)].map(match => JSON.parse(match[1]));
const reads = ['get_guild_list', 'get_guild_applications', 'get_guild_members', 'get_guild_review_applications'];
const actions = [...reads, 'apply_to_guild', 'cancel_guild_application', 'approve_guild_application', 'reject_guild_application'];
const clean = (value: any): any => Array.isArray(value) ? value.map(clean) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null).map(([key, v]) => [key, clean(v)])) : value;
for (const action of actions) test(`${action}: 实际宗门申请、权限、原申请审核及回执`, async t => {
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
    assert.equal(request.headers['x-bid'], current.bid);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, current.command);
    assert.deepEqual(body.arguments, current.args);
    assert.ok([...body.messageText].length <= 80);
    assert.equal(body.taskInput, undefined);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  let success = 0;
  let refused = 0;
  for (current of rows) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: current.bid });
    const originalText = event.MessageText;
    const invoke = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, current.input), 'ai-plugin');
    const run = await invoke();
    assert.deepEqual(run.errors, []);
    assert.deepEqual(run.messages, []);
    assert.deepEqual(run.actions, []);
    assert.equal(event.MessageText, originalText);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const actual = run.value.data as any;
    const server = current.envelope.data;
    assert.equal(actual.success, server.success);
    assert.deepEqual(actual.replies, server.middleware.replies);
    if (!server.success) { refused++; assert.equal(actual.result, undefined); continue; }
    success++;
    const data = server.data;
    if (reads.includes(action)) assert.deepEqual(actual.result, clean(data));
    else if (action === 'cancel_guild_application') assert.deepEqual(actual.result, clean({ ...data.receipt, message: data.message }));
    else {
      assert.deepEqual(actual.result, data.receipt);
      if (action === 'apply_to_guild') assert.equal(actual.result.guildId, current.input.guildId);
      if (action === 'approve_guild_application' || action === 'reject_guild_application') {
        assert.equal(actual.result.applicationId, current.input.applicationId);
        assert.equal(actual.result.applicantId, current.input.applicantId);
      }
    }
    const retry = await invoke();
    assert.equal(retry.value.ok, true);
    if (retry.value.ok) assert.deepEqual(retry.value.data, run.value.data);
    assert.ok(requests.at(-1).headers['idempotency-key']);
    if (reads.includes(action)) assert.notEqual(requests.at(-1).headers['idempotency-key'], requests.at(-2).headers['idempotency-key']);
    else assert.equal(requests.at(-1).headers['idempotency-key'], requests.at(-2).headers['idempotency-key']);
  }
  assert.ok(success > 0);
  if (!['get_guild_list', 'get_guild_applications'].includes(action)) assert.ok(refused > 0);
});
for (const action of actions) for (const mode of ['disabled', 'spoof', 'missing-id', 'cancel', 'empty'] as const) test(`${action}: ${mode}`, async t => {
  const fixture = fixtures.find(row => row.action === action && row.envelope.data.success);
  assert.ok(fixture);
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
    envelope.data.data = {};
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: fixture.bid });
  if (mode === 'missing-id') Object.assign(event, { MessageId: '', InteractionId: '' });
  const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, mode === 'spoof' ? { ...fixture.input, uid: 999 } : fixture.input, { signal: controller.signal }), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.deepEqual(run.messages, []);
  assert.deepEqual(run.actions, []);
  assert.equal(run.value.ok, false);
  assert.equal(calls, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 0 : 1);
});
for (const [action, input] of [
  ['get_guild_list', { page: 0 }], ['apply_to_guild', { guildId: 0 }],
  ['get_guild_applications', { freshRead: false }], ['apply_to_guild', { guildId: 1, freshRead: true }],
  ['cancel_guild_application', { applicationId: 1.5 }], ['get_guild_members', { page: -1 }],
  ['approve_guild_application', { applicantId: 1 }], ['approve_guild_application', { applicantId: 1, applicationId: 0 }],
  ['reject_guild_application', { applicantId: 1, applicationId: 1, force: true }],
  ['get_guild_review_applications', { page: Number.MAX_SAFE_INTEGER + 1 }]
] as const) test(`${action}: 拒绝无效宗门参数 ${JSON.stringify(input)}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('invalid input must not reach HTTP'); });
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, false);
  if (!run.value.ok) assert.equal(run.value.error.code, 'INVALID_INPUT');
});

test('同一 AI 消息中申请后重新查询读取新状态，写操作重试仍复用原回执', async t => {
  const empty = fixtures.find(row => row.action === 'get_guild_applications' && row.bid === 'player' && row.envelope.data.data.applications.length === 0 && !row.envelope.data.data.hasGuild);
  const pending = fixtures.find(row => row.action === 'get_guild_applications' && row.bid === 'player' && row.envelope.data.data.applications.length > 0);
  const submitted = fixtures.find(row => row.action === 'apply_to_guild' && row.envelope.data.success);
  assert.ok(empty && pending && submitted);
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let applied = false;
  const cache = new Map<string, any>();
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const key = request.headers['idempotency-key'];
    assert.ok(key);
    let envelope = cache.get(key);
    if (!envelope) {
      if (new URL(request.url).pathname.endsWith('/guild.apply')) { envelope = submitted.envelope; applied = true; }
      else envelope = applied ? pending.envelope : empty.envelope;
      cache.set(key, envelope);
    }
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = async (action: string, input: any) => {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.deepEqual(run.errors, []);
    assert.deepEqual(run.messages, []);
    assert.deepEqual(run.actions, []);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    return run.value.ok ? run.value.data as any : undefined;
  };
  assert.equal((await call('get_guild_applications', {})).result.applications.length, 0);
  const result = await call('apply_to_guild', submitted.input);
  assert.equal((await call('get_guild_applications', {})).result.applications[0].id, result.result.applicationId);
  assert.deepEqual(await call('apply_to_guild', submitted.input), result);
  assert.equal(cache.size, 3, '两次查询分别刷新，一次写入只保留一个幂等回执');
});
