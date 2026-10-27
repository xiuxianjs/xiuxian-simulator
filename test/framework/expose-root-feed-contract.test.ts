import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeRootFeedContracts$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 24 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_ROOT_FEED_HTTP=(.+)/g)].map(match => JSON.parse(match[1])).filter(row => row.action !== 'override');
const actions = ['preview_spirit_root_feed', 'confirm_spirit_root_feed'];
for (const action of actions) test(`${action}: 实际灵根原预览到原材料结算`, async t => {
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
    assert.ok([...body.messageText].length <= 80);
    assert.ok(Buffer.byteLength(body.messageText, 'utf8') >= [...body.messageText].length);
    assert.equal(body.taskInput, undefined);
    return { status: current.status, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  let success = 0;
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
    success++;
    const result = (run.value.data as any).result;
    const data = current.envelope.data.data;
    if (action === 'preview_spirit_root_feed') {
      assert.deepEqual(result, data);
      assert.equal(result.itemId, current.input.itemId);
      assert.equal(result.requested, current.input.quantity);
      assert.match(result.reference, /^r1_1_r_[a-z0-9]+_[a-f0-9]{24}$/);
      if (current.scenario === 'success') assert.ok(fixtures.some(row => row.action === 'confirm_spirit_root_feed' && row.input.reference === result.reference));
    } else {
      assert.deepEqual(result.feed, data.feed);
      assert.equal(result.message, data.message);
      for (const [key, value] of Object.entries(result.view)) assert.deepEqual(value, data.view[key], key);
      assert.equal(result.feed.requested, 10);
      assert.equal(result.feed.consumed, 1);
      assert.equal(result.feed.pointsAdded, 5);
      assert.equal(result.view.cultivation, 104);
    }
    const retry = await invoke();
    assert.equal(retry.value.ok, true);
    if (retry.value.ok) assert.deepEqual(retry.value.data, run.value.data);
    assert.ok(requests.at(-1).headers['idempotency-key']);
    assert.equal(requests.at(-1).headers['idempotency-key'], requests.at(-2).headers['idempotency-key']);
  }
  assert.ok(success > 0);
  if (action === 'confirm_spirit_root_feed') assert.ok(refused > 0);
});
for (const action of actions) for (const mode of ['disabled', 'spoof', 'missing-id', 'cancel', 'empty', 'mismatch'] as const) test(`${action}: ${mode}`, async t => {
  const fixture = fixtures.find(row => row.action === action && row.status === 200);
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
    if (mode === 'empty') envelope.data.data = {};
    if (mode === 'mismatch') {
      if (action === 'preview_spirit_root_feed') envelope.data.data.itemId++;
      else envelope.data.data.feed.after++;
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
  ['preview_spirit_root_feed', { itemId: 1, quantity: 1000001 }],
  ['confirm_spirit_root_feed', {}], ['confirm_spirit_root_feed', { reference: '' }],
  ['confirm_spirit_root_feed', { reference: 'r1_1_p_abc_' + 'a'.repeat(24) }],
  ['confirm_spirit_root_feed', { reference: 'r1_1_r_abc_' + 'a'.repeat(23) }],
  ['confirm_spirit_root_feed', { reference: 'r1_1_r_abc_' + 'a'.repeat(24), itemId: 1 }]
] as const) test(`${action}: 拒绝非法培养引用参数 ${JSON.stringify(input)}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('invalid input must not reach HTTP'); });
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, false);
  if (!run.value.ok) assert.equal(run.value.error.code, 'INVALID_INPUT');
});
