import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeCaveExtraContracts$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_CAVE_EXTRA=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(match => ({ action: match[1], scenario: match[2], args: JSON.parse(match[3]), envelope: JSON.parse(match[4]) }));
assert.equal(fixtures.length, 6);
for (const action of ['cultivate_all_cave_plots', 'upgrade_cave_plot', 'get_cave_acceleration_options']) test(`${action}: 服务端实际状态及回执`, async t => {
  const rows = fixtures.filter(row => row.action === action);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const operation = action === 'cultivate_all_cave_plots' ? 'cave.cultivate' : action === 'upgrade_cave_plot' ? 'cave.upgrade' : 'cave.accelerate';
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${operation}`);
    assert.equal(request.headers['x-bid'], 'player');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args);
    assert.equal(body.messageText, action === 'cultivate_all_cave_plots' ? '/开垦所有' : action === 'upgrade_cave_plot' ? '/升级灵田 1' : '/灵田加速 1');
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  let success = 0;
  for (current of rows) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const input = action === 'cultivate_all_cave_plots' ? {} : { plotIndex: 1 };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const run = await call();
    assert.deepEqual(run.errors, []);
    assert.deepEqual(run.messages, []);
    assert.deepEqual(run.actions, []);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    const source = current.envelope.data;
    assert.equal(result.success, source.success);
    assert.deepEqual(result.replies, source.middleware.replies);
    if (!source.success) { assert.equal(result.result, undefined); continue; }
    success++;
    const native = action === 'cultivate_all_cave_plots' ? source.data : action === 'upgrade_cave_plot' ? source.data.result : source.data.preview;
    assert.equal(result.result.message, native.message);
    if (action === 'get_cave_acceleration_options') {
      assert.equal(result.result.found, native.found);
      if (native.found) assert.equal(result.result.plotIndex, 1);
    } else {
      assert.equal(result.result.snapshotError, native.snapshotError || undefined);
      assert.equal(result.result.needsSeedSelection, native.needsSeedSelection ?? false);
    }
    const retry = await call();
    assert.equal(retry.value.ok, true);
    if (retry.value.ok) assert.deepEqual(retry.value.data, run.value.data);
    if (action === 'get_cave_acceleration_options') assert.notEqual(keys.at(-1), keys.at(-2));
    else assert.equal(keys.at(-1), keys.at(-2));
  }
  assert.ok(success > 0);
});
for (const [action, input] of [
  ['cultivate_all_cave_plots', { plotIndex: 1 }], ['upgrade_cave_plot', {}], ['upgrade_cave_plot', { plotIndex: 0 }],
  ['upgrade_cave_plot', { plotIndex: 1, uid: 2 }], ['get_cave_acceleration_options', { plotIndex: -1 }]
] as const) test(`${action}: 拒绝无效输入`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('invalid input reached HTTP'); });
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, false);
});

test('加速报价不把服务端缺失的可选价格填为零', async t => {
  const fixture = fixtures.find(row => row.scenario === 'acceleration');
  assert.ok(fixture);
  const envelope = structuredClone(fixture.envelope);
  for (const key of ['spiritStoneEnabled', 'spiritStone', 'stoneCost', 'maxSpiritStone', 'ripenCost', 'canRipen']) delete envelope.data.data.preview[key];
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify(envelope) }) }));
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_cave_acceleration_options', { plotIndex: 1 }), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) {
    const result = (run.value.data as any).result;
    assert.equal(result.found, true);
    for (const key of ['spiritStoneEnabled', 'spiritStone', 'stoneCost', 'maxSpiritStone', 'ripenCost', 'canRipen']) assert.equal(result[key], undefined);
  }
});
