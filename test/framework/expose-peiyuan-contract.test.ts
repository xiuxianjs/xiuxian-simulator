import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposePeiyuanContracts$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_PEIYUAN_HTTP=(.+)/g)].map(match => JSON.parse(match[1]));
const actions = ['get_peiyuan_confirmation', 'confirm_peiyuan_pill', 'cancel_peiyuan_pill'];
const pendingFacts = (value: any) => Object.fromEntries(['quantity', 'itemId', 'createdAt', 'snapshot', 'changes', 'view'].map(key => [key, value[key]]));
for (const action of ['consume_item', ...actions]) test(`${action}: 实际培元丹原预览、确认取消与拒绝`, async t => {
  const rows = fixtures.filter(row => row.action === action);
  assert.ok(rows.length > 0);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
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
    assert.ok([...body.messageText].length <= 80);
    assert.ok(Buffer.byteLength(body.messageText, 'utf8') >= [...body.messageText].length);
    assert.equal(body.taskInput, undefined);
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
    if (!run.value.ok) { refused++; continue; }
    succeeded++;
    const result = (run.value.data as any).result;
    const data = current.envelope.data.data;
    if (action === 'consume_item') {
      assert.equal(result.outcome, 'peiyuan_pending');
      assert.deepEqual(result.peiyuanPending, { quantity: data.pending.quantity, view: data.pending.view, snapshot: data.pending.snapshot });
      assert.match(result.peiyuanPending.snapshot, /^[a-f0-9]{64}$/);
      assert.ok(fixtures.some(row => row.action === 'get_peiyuan_confirmation' && row.input.snapshot === result.peiyuanPending.snapshot));
    } else if (action === 'get_peiyuan_confirmation') {
      assert.match(result.reference, /^r1_1_p_[a-z0-9]+_[a-f0-9]{24}$/);
      assert.equal(result.expiresAt, data.expiresAt);
      assert.equal(result.pending.snapshot, current.input.snapshot);
      assert.deepEqual(result.pending, pendingFacts(data.pending));
      if (current.scenario === 'confirm' || current.scenario === 'cancel') assert.ok(fixtures.some(row => row.input.reference === result.reference), '返回引用必须可原样确认或取消');
    } else {
      assert.equal(result.outcome, action === 'confirm_peiyuan_pill' ? 'confirmed' : 'cancelled');
      assert.equal(result.message, data.message);
      assert.deepEqual(result.pending, pendingFacts(data.pending));
      assert.ok(fixtures.some(row => row.action === 'consume_item' && row.envelope.data.data.pending.snapshot === result.pending.snapshot));
    }
    const retry = await invoke();
    assert.equal(retry.value.ok, true);
    if (retry.value.ok) assert.deepEqual(retry.value.data, run.value.data);
    assert.ok(requests.at(-1).headers['idempotency-key']);
    assert.equal(requests.at(-1).headers['idempotency-key'], requests.at(-2).headers['idempotency-key']);
  }
  assert.ok(succeeded > 0);
  if (action === 'confirm_peiyuan_pill' || action === 'cancel_peiyuan_pill') assert.ok(refused > 0);
});
for (const action of actions) for (const mode of ['disabled', 'spoof', 'missing-id', 'cancel', 'empty', 'wrong-snapshot'] as const) test(`${action}: ${mode}`, async t => {
  const fixture = fixtures.find(row => row.action === action && row.status === 200);
  assert.ok(fixture);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { expose: { enabled: mode !== 'disabled' }, backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
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
    if (mode === 'empty') envelope.data.data = {};
    if (mode === 'wrong-snapshot') {
      if (action === 'get_peiyuan_confirmation') envelope.data.data.pending.snapshot = '0'.repeat(64);
      else envelope.data.data.pending.changes = [{ attribute: 'admin', attributeName: '力量', oldValue: 1, newValue: 2, change: 1 }];
    }
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  if (mode === 'missing-id') Object.assign(event, { MessageId: '', InteractionId: '' });
  const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, mode === 'spoof' ? { ...fixture.input, uid: 999 } : fixture.input, { signal: controller.signal }), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.deepEqual(run.messages, []);
  assert.deepEqual(run.actions, []);
  assert.equal(run.value.ok, false);
  assert.equal(calls, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 0 : 1);
});
for (const [action, input] of [
  ['get_peiyuan_confirmation', {}], ['get_peiyuan_confirmation', { snapshot: 'a'.repeat(63) }],
  ['get_peiyuan_confirmation', { snapshot: 'A'.repeat(64) }], ['get_peiyuan_confirmation', { snapshot: 'a'.repeat(64), latest: true }],
  ['confirm_peiyuan_pill', { reference: '' }], ['confirm_peiyuan_pill', { reference: 'r1_1_a_abc_' + 'a'.repeat(24) }],
  ['cancel_peiyuan_pill', { reference: 'r1_1_p_abc_' + 'a'.repeat(23) }], ['cancel_peiyuan_pill', { reference: 'r1_1_p_abc_' + 'a'.repeat(24), force: true }]
] as const) test(`${action}: 拒绝非法原预览参数 ${JSON.stringify(input)}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('invalid input must not reach HTTP'); });
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, false);
  if (!run.value.ok) assert.equal(run.value.error.code, 'INVALID_INPUT');
});
