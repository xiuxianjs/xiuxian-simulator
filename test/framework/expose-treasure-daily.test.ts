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
const output = goTestFixture(['test', './internal/service', '-run', '^TestTreasureDailyExposeFixtures$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = Object.fromEntries([...output.matchAll(/TREASURE_DAILY_EXPOSE=([^|]+)\|(.+)/g)].map(row => [row[1], JSON.parse(row[2])]));
const base = JSON.parse(readFileSync(new URL('../fixtures/expose-master.json', import.meta.url), 'utf8')).teach;

test('灵脉与私聊礼包保留服务端资格、原引用和领取回执', async t => {
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
  const call = (action: string, input: any, target: typeof event | ReturnType<typeof app.events.groupMessage> = event) => app.invoke(target, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  for (const [operation, action, fixture, args, read] of [
    ['spirit-vein.overview', 'get_spirit_vein', 'vein', {}, true],
    ['spirit-vein.calendar', 'get_spirit_vein_calendar', 'calendar', { page: 1 }, true],
    ['treasures.daily-packs', 'get_treasure_daily_packs', 'packs', {}, true],
    ['treasures.daily-pack-free-preview', 'preview_treasure_free_daily_pack', 'preview', {}, false]
  ] as const) {
    op = operation; data = fixtures[fixture]; expected = args;
    const first = await call(action, {}); assert.equal(first.value.ok, true, `${action}: ${JSON.stringify(first.value)}`);
    if (first.value.ok && fixture === 'packs') assert.equal((first.value.data as any).result.products.length, data.products.length);
    if (first.value.ok && fixture === 'preview') assert.equal((first.value.data as any).result.confirmationRef, data.confirmationRef);
    await call(action, {}); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
  }
  const ref = fixtures.preview.confirmationRef; op = 'treasures.daily-pack-free-confirm'; data = fixtures.confirm; expected = { confirmationRef: ref };
  const confirmed = await call('confirm_treasure_free_daily_pack', { confirmationRef: ref }); assert.equal(confirmed.value.ok, true, JSON.stringify(confirmed.value));
  if (confirmed.value.ok) {
    const result = (confirmed.value.data as any).result;
    assert.equal(result.operationId, fixtures.preview.operationId);
    assert.equal(result.grant.spiritCrystal, data.result.dailyTreasurePack.spiritCrystal);
  }
  await call('confirm_treasure_free_daily_pack', { confirmationRef: ref }); assert.equal(keys.at(-1), keys.at(-2));
  const beforeInvalid = keys.length;
  const invalid = await call('confirm_treasure_free_daily_pack', { confirmationRef: ref.slice(0, -1) });
  assert.equal(invalid.value.ok, false); assert.equal(keys.length, beforeInvalid);
  const group = app.events.groupMessage({ platform: 'qq-bot', userId: 'player' }); const before = keys.length;
  for (const [action, input] of [['get_treasure_daily_packs', {}], ['preview_treasure_free_daily_pack', {}], ['confirm_treasure_free_daily_pack', { confirmationRef: ref }]] as const) {
    const result = await call(action, input, group); assert.equal(result.value.ok, false); assert.equal(keys.length, before);
  }
});
