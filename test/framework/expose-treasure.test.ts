import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/service', '-run', '^TestTreasureExpose(Fixtures|BatchFixtures)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = Object.fromEntries([...output.matchAll(/TREASURE_EXPOSE=([^|]+)\|(.+)/g)].map(row => [row[1], JSON.parse(row[2])]));
const base = JSON.parse(readFileSync(new URL('../fixtures/expose-master.json', import.meta.url), 'utf8')).teach;

test('宝物查询、原预览、结算和状态核对使用真实服务数据', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  let op = ''; let data: any; let expected: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, expected); keys.push(request.headers['idempotency-key']);
    const envelope = structuredClone(base); envelope.data.data = data;
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const call = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  for (const [operation, action, fixture] of [['treasures.overview', 'get_treasures', 'overview'], ['ancient-relics.overview', 'get_ancient_relics', 'relics']] as const) {
    op = operation; data = fixtures[fixture]; expected = {};
    const result = await call(action, {}); assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok && fixture === 'overview') assert.equal((result.value.data as any).result.items.length, data.items.length);
  }
  for (const [kind, action, input, args] of [
    ['explore', 'preview_treasure_exploration', { source: 'spirit_crystal', count: 1 }, { kind: 'explore', source: 'spirit_crystal', count: 1 }],
    ['upgrade', 'preview_treasure_upgrade', { treasureId: 101 }, { kind: 'upgrade', treasureId: 101 }],
    ['decompose', 'preview_treasure_decomposition', { items: [{ treasureId: 101, kind: 'fragment', quantity: 1 }] }, { kind: 'decompose', items: [{ treasureId: 101, kind: 'fragment', quantity: 1 }] }],
    ['batch-upgrade', 'preview_treasure_batch_upgrade', {}, { kind: 'batch-upgrade' }],
    ['batch-promote', 'preview_treasure_batch_promotion', {}, { kind: 'batch-promote' }]
  ] as const) {
    op = 'treasures.preview'; data = fixtures[`preview-${kind}`]; expected = args;
    const preview = await call(action, input); assert.equal(preview.value.ok, true, `${kind}: ${JSON.stringify(preview.value)}`);
    const ref = data.confirmationRef; const operationId = data.operationId;
    if (preview.value.ok) assert.equal((preview.value.data as any).result.confirmationRef, ref);
    if (kind === 'decompose' && preview.value.ok) assert.equal(JSON.parse((preview.value.data as any).result.detailsJson).totalXianYun, data.data.totalXianYun);
    op = 'treasures.confirm'; data = fixtures[`confirm-${kind}`]; expected = { confirmationRef: ref };
    const confirm = () => call('confirm_treasure_action', { confirmationRef: ref });
    const result = await confirm(); assert.equal(result.value.ok, true, `${kind}: ${JSON.stringify(result.value)}`);
    if (result.value.ok) { assert.equal((result.value.data as any).result.operationId, operationId); assert.deepEqual(JSON.parse((result.value.data as any).result.resultJson), data.result); }
    await confirm(); assert.equal(keys.at(-1), keys.at(-2));
    if (!fixtures[`status-${kind}`]) continue;
    op = 'treasures.operation-status'; data = fixtures[`status-${kind}`]; expected = { operationId };
    const status = await call('get_treasure_operation_status', { operationId }); assert.equal(status.value.ok, true, JSON.stringify(status.value));
    if (status.value.ok) assert.equal((status.value.data as any).result.status, 'completed');
  }
});
