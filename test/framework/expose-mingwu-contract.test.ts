import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeMingwuContracts$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 24 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_MINGWU_HTTP=(.+)/g)].map(match => JSON.parse(match[1])).filter(row => row.scenario !== 'legacy');
for (const row of fixtures) test(`明悟丹实际选择到结算: ${row.scenario}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const path = new URL(request.url).pathname;
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(request.headers['x-bid'], 'player');
    assert.ok([...body.messageText].length <= 80);
    if (path.endsWith('/items.consume')) {
      assert.deepEqual(body.arguments, { itemName: '明悟丹', quantity: row.input.quantity, mode: 'expose' });
      return { status: 200, headers: {}, data: JSON.stringify(row.preparation) };
    }
    assert.equal(path, '/api/v2/robot/business/mingwu.confirm');
    assert.equal(body.messageText, `/确认明悟丹 ${row.input.skillBookId} ${row.input.quantity}`);
    assert.deepEqual(body.arguments, row.args);
    assert.equal(Object.hasOwn(body.arguments, 'expectedProficiency'), true);
    requests.push(request);
    return { status: row.status, headers: {}, data: JSON.stringify(row.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  const preview = await call('consume_item', { itemName: '明悟丹', quantity: row.input.quantity });
  assert.deepEqual(preview.errors, []);
  assert.deepEqual(preview.messages, []);
  assert.deepEqual(preview.actions, []);
  assert.equal(preview.value.ok, true, JSON.stringify(preview.value));
  if (!preview.value.ok) return;
  const selection = (preview.value.data as any).result.mingwuSelection;
  const selected = selection.books.find((book: any) => book.skillBookId === row.input.skillBookId);
  assert.equal(selected.canSelect, true);
  const input = { skillBookId: selected.skillBookId, quantity: selection.quantity, expectedProficiency: selected.proficiency };
  assert.deepEqual(input, row.input);
  const run = await call('use_mingwu_pill', input);
  assert.deepEqual(run.errors, []);
  assert.deepEqual(run.messages, []);
  assert.deepEqual(run.actions, []);
  assert.equal(run.value.ok, row.status === 200, JSON.stringify(run.value));
  if (run.value.ok) {
    const result = (run.value.data as any).result;
    assert.deepEqual(result, row.envelope.data.data);
    assert.equal(result.consumedCount, 1);
    assert.equal(result.currentProficiency - input.expectedProficiency, result.proficiencyGain);
    assert.equal(result.remainingCount, 9);
    const retry = await call('use_mingwu_pill', input);
    assert.equal(retry.value.ok, true);
    if (retry.value.ok) assert.deepEqual(retry.value.data, run.value.data);
    assert.ok(requests[0].headers['idempotency-key']);
    assert.equal(requests[0].headers['idempotency-key'], requests[1].headers['idempotency-key']);
  }
});
const ready = fixtures.find(row => row.scenario === 'ready');
assert.ok(ready);
for (const mode of ['disabled', 'spoof', 'missing-id', 'cancel', 'empty', 'bad-count', 'wrong-state'] as const) test(`use_mingwu_pill: ${mode}`, async t => {
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
    const envelope = structuredClone(ready.envelope);
    if (mode === 'empty') envelope.data.data = {};
    if (mode === 'bad-count') envelope.data.data.consumedCount = 999;
    if (mode === 'wrong-state') envelope.data.data.currentProficiency = 59;
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  if (mode === 'missing-id') Object.assign(event, { MessageId: '', InteractionId: '' });
  const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'use_mingwu_pill', mode === 'spoof' ? { ...ready.input, uid: 999 } : ready.input, { signal: controller.signal }), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.deepEqual(run.messages, []);
  assert.deepEqual(run.actions, []);
  assert.equal(run.value.ok, false);
  assert.equal(calls, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 0 : 1);
});
for (const input of [
  { skillBookId: 0, quantity: 1, expectedProficiency: 20 },
  { skillBookId: 3, quantity: 0, expectedProficiency: 20 },
  { skillBookId: 3, quantity: 1.5, expectedProficiency: 20 },
  { skillBookId: 3, quantity: 1, expectedProficiency: -1 },
  { skillBookId: 3, quantity: 1, expectedProficiency: 60 },
  { skillBookId: 3, quantity: 1 },
  { skillBookId: 3, quantity: 1, expectedProficiency: 20, force: true }
]) test(`use_mingwu_pill 拒绝非法参数 ${JSON.stringify(input)}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('invalid input must not reach HTTP'); });
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'use_mingwu_pill', input), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, false);
  if (!run.value.ok) assert.equal(run.value.error.code, 'INVALID_INPUT');
});
