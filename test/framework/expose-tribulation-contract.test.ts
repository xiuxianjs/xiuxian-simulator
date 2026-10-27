import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeTribulationReferences$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_TRIBULATION=([^|]+)\|(.+)/g)].map(match => ({ args: JSON.parse(match[1]), data: JSON.parse(match[2]), uid: 1 }));
assert.equal(fixtures.length, 9);
const promotion = output.match(/EXPOSE_PROMOTION=(.+)/);
const evasion = output.match(/EXPOSE_EVASION=(.+)/);
assert.ok(promotion); assert.ok(evasion);
const specs = [
  { action: 'promote_realm', operation: 'realm.promotion', rows: [{ args: {}, data: JSON.parse(promotion[1]), uid: 1 }], input: (_row: any) => ({}) },
  { action: 'get_tribulation_preparation', query: 'overview', rows: fixtures.filter(row => row.args.kind === 'overview' || row.args.kind === 'heartPreview'), input: (_row: any) => ({}) },
  { action: 'open_tribulation', operation: 'tribulation.command', rows: fixtures.filter(row => row.args.kind === 'open'), input: (row: any) => ({ eventId: row.args.eventId }) },
  { action: 'preview_tribulation', operation: 'tribulation.command', rows: fixtures.filter(row => row.args.kind === 'confirm'), input: (row: any) => ({ eventId: row.args.eventId, grade: row.args.grade }) },
  { action: 'confirm_tribulation', operation: 'tribulation.command', rows: fixtures.filter(row => row.args.reference?.split('_')[2] === 't'), input: (row: any) => ({ reference: row.args.reference }) },
  { action: 'get_tribulation_result', query: 'receipt', rows: fixtures.filter(row => row.args.kind === 'receipt' || row.data.status === 'charging'), input: (row: any) => ({ eventId: row.data.eventId }) },
  { action: 'preview_heart_demon', operation: 'tribulation.command', rows: fixtures.filter(row => row.args.kind === 'heartPreview'), input: (row: any) => ({ eventId: row.args.eventId, choice: row.args.choice }) },
  { action: 'confirm_heart_demon', operation: 'tribulation.command', rows: fixtures.filter(row => row.args.reference?.split('_')[2] === 'h'), input: (row: any) => ({ reference: row.args.reference }) },
  { action: 'evade_tribulation', operation: 'tribulation.command', rows: [{ args: { kind: 'evade', eventId: 2 }, data: JSON.parse(evasion[1]), uid: 3 }], input: (_row: any) => ({ eventId: 2 }) }
];
for (const spec of specs) test(`${spec.action}: 实际 Go 状态、原引用与重试`, async t => {
  assert.ok(spec.rows.length > 0, spec.action);
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = spec.rows[0];
  let requests = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const identity = request.url.endsWith('/robot/identity');
    if (!identity) requests++;
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'owner', account: { status: 'registered', playerId: current.uid } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    if (!spec.query) {
      assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${spec.operation}`);
      const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
      if (spec.operation === 'tribulation.command') {
        assert.equal(body.arguments.kind, current.args.kind);
        if (current.args.reference) {
          assert.equal(body.arguments.reference, current.args.reference);
          assert.ok([...body.messageText].length <= 80, `${[...body.messageText].length} chars; ${Buffer.byteLength(body.messageText)} bytes`);
        }
      }
    }
    return { status: 200, headers: {}, data: JSON.stringify(spec.query ? { data: identity ? middleware.identity : current.data } : { data: { success: true, branch: 'business', middleware, data: current.data } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' });
  for (current of spec.rows) {
    const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', spec.action, spec.input(current)), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (!result.value.ok) continue;
    const data = spec.query ? result.value.data as any : (result.value.data as any).result;
    if (spec.action === 'promote_realm') assert.equal(data.mode, current.data.mode);
    if (spec.action === 'get_tribulation_preparation' || spec.action === 'preview_heart_demon') assert.equal(data.preparation.eventId, current.data.tribulationPreparation.eventId);
    if (spec.action === 'preview_tribulation') {
      assert.equal(data.confirmationReference, current.data.confirmationReference);
      assert.equal(data.confirmation.attackMultiplier, current.data.confirmation.attackMultiplier);
      assert.equal(data.confirmation.battle.name, current.data.confirmation.battle.name);
      assert.equal(data.confirmation.battle.mode, current.data.confirmation.battle.mode);
      const publicUnit = (unit: Record<string, unknown>) => Object.fromEntries(['Name', 'HP', 'MP', 'PhysicalAttack', 'MagicAttack', 'PhysicalDefense', 'MagicDefense', 'Speed'].map(key => [key, unit[key]]));
      assert.deepEqual(data.confirmation.battle.player, publicUnit(current.data.confirmation.battle.player));
      assert.deepEqual(data.confirmation.battle.layers, current.data.confirmation.battle.layers.map((layer: any) => ({ layer: layer.layer, enemies: layer.enemies.map(publicUnit) })));
      assert.equal('conditionVersion' in data.confirmation, false);
    }
    if (spec.action === 'preview_heart_demon') assert.equal(data.confirmationReference, current.data.confirmationReference);
    if (spec.action === 'confirm_heart_demon') assert.equal(data.choice, current.data.choice);
    if (spec.action === 'evade_tribulation') assert.deepEqual(data, current.data);
    if (spec.action === 'confirm_tribulation' || spec.action === 'get_tribulation_result') {
      assert.equal(data.kind, 'charging');
      assert.equal(data.charging.eventId, current.data.eventId);
      assert.equal(data.charging.status, 'charging');
      assert.equal(data.receipt, undefined);
      assert.equal('resolvedCommand' in data, false);
    }
  }
  assert.equal(requests, spec.rows.length);
});

test('开劫结果待核实：保留双方错误，不自动重新预览或提交', async t => {
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let calls = 0;
  const failure = { code: 'CONFLICT', message: '确认结果待核实' };
  const receiptFailure = { code: 'NOT_FOUND', message: '尚无结算' };
  t.mock.method(axios, 'create', () => ({ request: async () => {
    calls++;
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'owner', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data: { startFailure: failure, startStatus: 409, receiptFailure, receiptStatus: 404 } } }) };
  } }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'confirm_tribulation', { reference: 'r1_1_t_abc_' + 'a'.repeat(24) }), 'ai-plugin');
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.deepEqual((result.value.data as any).result, { kind: 'unconfirmed', failure, status: 409, receiptFailure, receiptStatus: 404 });
  assert.equal(calls, 1);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
});
