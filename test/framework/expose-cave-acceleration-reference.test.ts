import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeCaveAccelerationReference$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const previews = [...output.matchAll(/EXPOSE_CAVE_ACCEL_PREVIEW=([^|]+)\|([^|]+)\|(.+)/g)].map(match => ({ accelerator: match[1], reference: match[2], envelope: JSON.parse(match[3]) }));
const confirmations = [...output.matchAll(/EXPOSE_CAVE_ACCEL_CONFIRM=([^|]+)\|([^|]+)\|(.+)/g)].map(match => ({ accelerator: match[1], reference: match[2], envelope: JSON.parse(match[3]) }));
assert.equal(confirmations.length, 4);
for (const confirmed of confirmations) test(`灵田${confirmed.accelerator}：原报价及实际结算`, async t => {
  const preview = previews.find(row => row.reference === confirmed.reference);
  assert.ok(preview);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/cave.accelerate');
    assert.equal(request.headers['x-bid'], 'player');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    keys.push(request.headers['idempotency-key']);
    if (body.arguments.mode === 'prepare-reference') {
      assert.deepEqual(body.arguments, { mode: 'prepare-reference', plotIndex: '1', accelerator: confirmed.accelerator, count: '1' });
      assert.equal(body.messageText, '/灵田加速 1');
      return { status: 200, headers: {}, data: JSON.stringify(preview.envelope) };
    }
    assert.deepEqual(body.arguments, { mode: 'confirm-reference', reference: confirmed.reference });
    assert.equal(body.messageText, '/灵田加速');
    return { status: 200, headers: {}, data: JSON.stringify(confirmed.envelope) };
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
  const quote = await call('prepare_cave_acceleration', { plotIndex: 1, accelerator: confirmed.accelerator, count: 1 });
  assert.equal(quote.success, true);
  assert.equal(quote.result.reference, confirmed.reference);
  assert.equal(quote.result.plot.plotIndex, 1);
  assert.equal(quote.result.plot.cropName, preview.envelope.data.data.quote.plot.cropName);
  assert.equal(quote.result.maxSpiritStone, preview.envelope.data.data.quote.maxSpiritStone);
  const result = await call('confirm_cave_acceleration', { reference: quote.result.reference });
  assert.equal(result.success, true);
  const actual = confirmed.envelope.data.data.result;
  for (const key of ['message', 'actualCount', 'requestedCount', 'hoursReduced', 'secondsReduced', 'spiritStoneSpent', 'immediate']) assert.equal(result.result[key], actual[key]);
  assert.ok(result.result.spiritStoneSpent <= quote.result.maxSpiritStone);
  assert.equal(result.result.plot.plotIndex, 1);
  assert.deepEqual(await call('confirm_cave_acceleration', { reference: quote.result.reference }), result);
  assert.equal(keys[1], keys[2]);
  await call('prepare_cave_acceleration', { plotIndex: 1, accelerator: confirmed.accelerator, count: 1 });
  assert.notEqual(keys[0], keys[3]);
});
for (const [action, input] of [
  ['prepare_cave_acceleration', { plotIndex: 1, accelerator: 'ripen', count: 2 }],
  ['prepare_cave_acceleration', { plotIndex: 0, accelerator: 'lingfei', count: 1 }],
  ['prepare_cave_acceleration', { plotIndex: 1, accelerator: 'unknown', count: 1 }],
  ['prepare_cave_acceleration', { plotIndex: 1, accelerator: 'lingfei', count: 1, uid: 9 }],
  ['confirm_cave_acceleration', { reference: 'r1_1_c_a_bad' }],
  ['confirm_cave_acceleration', { reference: confirmations[0].reference.replace('_c_', '_l_') }]
] as const) test(`${action}: 拒绝无效参数`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('invalid input reached HTTP'); });
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, false);
});
