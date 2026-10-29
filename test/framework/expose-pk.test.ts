import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotPKExposeFixture$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_PK_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
test('争夺查询与私聊隐藏操作使用真实身份并保留回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let args: any = {}; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [operation, action, input, expected, read] of [
    ['pvp.pk-targets', 'get_pk_targets', {}, { cursor: 0 }, true],
    ['pvp.pk-hiding', 'get_pk_hiding', { assetKind: 'item' }, { private: true, assetKind: 'item', cursor: 0 }, true],
    ['pvp.pk-hide', 'set_pk_hidden_quantity', { assetKind: 'item', assetId: 2, quantity: 1 }, { private: true, assetKind: 'item', assetId: 2, quantity: 1 }, false],
    ['pvp.pk-history', 'get_pk_history', {}, { scope: 'all', cursor: 0 }, true],
    ['pvp.pk-report', 'get_pk_report', { reportId: 20 }, { reportId: 20 }, true],
    ['pvp.pk-replay', 'get_pk_replay', { reportId: 20, phase: 'ordinary' }, { reportId: 20, phase: 'ordinary', page: 1 }, true]
  ] as const) {
    op = operation; args = expected; envelope = fixtures.find(row => row.op === op)?.envelope; assert.ok(envelope, op);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    if (result.value.ok && action === 'set_pk_hidden_quantity') assert.equal((result.value.data as any).result.quantity, 1);
    if (result.value.ok && action === 'get_pk_report') assert.equal((result.value.data as any).result.summary.reportId, 20);
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
  }
  const group = app.events.groupMessage({ platform: 'qq-bot', userId: 'player' }); const before = keys.length;
  for (const [action, input] of [['get_pk_hiding', { assetKind: 'item' }], ['set_pk_hidden_quantity', { assetKind: 'item', assetId: 2, quantity: 1 }]] as const) {
    const result = await app.invoke(group, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.equal(result.value.ok, false); assert.equal(keys.length, before);
  }
  op = 'pvp.pk-hiding'; args = { private: true, assetKind: 'item', cursor: 0 }; envelope = structuredClone(fixtures.find(row => row.op === op)!.envelope);
  envelope.data.data.view.assets = [{ assetKind: 'item', assetId: 2, ownerId: 2, hiddenQuantity: 1, heldQuantity: 0 }];
  const foreign = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_pk_hiding', { assetKind: 'item' }), 'ai-plugin');
  assert.equal(foreign.value.ok, false);
});
