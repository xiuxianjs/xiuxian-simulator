import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessExposeDailyContracts|TestRobotBusinessGuildClaimsSettlementPartialAndReplay|TestRobotBusinessGuildActivitySettlementGuideAndReplay)$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_DAILY_HTTP=([^|]+)\|([^|]+)\|(.+)/g)].map(match => ({ operation: match[1], args: JSON.parse(match[2]), envelope: JSON.parse(match[3]) }));
for (const match of output.matchAll(/ROBOT_GUILD_(?:CLAIMS|ACTIVITY)_RESPONSE=([^|]+)\|player\|(.+)/g)) fixtures.push({ operation: match[1], args: {}, envelope: JSON.parse(match[2]) });
const specs = [
  ['cultivate_cave_plot', 'cave.cultivate'], ['plant_cave_seed', 'cave.plant'], ['water_cave_plots', 'cave.water'],
  ['remove_cave_worms', 'cave.worm'], ['remove_cave_weeds', 'cave.weed'], ['harvest_cave_plots', 'cave.harvest'], ['tend_cave_plots', 'cave.tend-all'],
  ['checkin_guild', 'guild.checkin'], ['mine_guild', 'guild.mining'], ['claim_guild_stipend', 'guild.stipend-claim']
];
for (const [action, operation] of specs) test(`${action}: 实际 Go 日常结算及重复领取`, async t => {
  const rows = fixtures.filter(row => row.operation === operation);
  assert.ok(rows.length > 0, action);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${operation}`);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  let success = 0;
  for (current of rows) {
    const input = { ...current.args };
    if ('plotIndex' in input) input.plotIndex = Number(input.plotIndex);
    if ('harvest' in input) delete input.harvest;
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (!result.value.ok) continue;
    const actual = result.value.data as any;
    const server = current.envelope.data;
    assert.equal(actual.success, server.success);
    if (!server.success || server.branch !== 'business') { assert.equal(actual.result, undefined); continue; }
    success++;
    const data = server.data.mode ? server.data.result : server.data;
    assert.equal(actual.result.message, data.message);
    assert.equal(actual.result.snapshotError, data.snapshotError ?? undefined);
    if (data.receipt) assert.deepEqual(actual.result.receipt, data.receipt);
    if (data.overview) {
      assert.equal(actual.result.overview.plantedCount, data.overview.plantedCount);
      assert.equal(actual.result.overview.matureCount, data.overview.matureCount);
    }
  }
  assert.ok(success > 0, action);
});

test('get_cave_plant_options: 真实播种选项及成熟时长', async t => {
  const match = output.match(/EXPOSE_CAVE_READ=(.+)/);
  assert.ok(match);
  const fixture = JSON.parse(match[1]);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => ({ status: 200, headers: {}, data: JSON.stringify(request.url.endsWith('/robot/identity') ? { data: { bid: 'player', account: { status: 'registered', playerId: 1 } } } : fixture) }) }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_cave_plant_options', { plotIndex: 1 }), 'ai-plugin');
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.deepEqual((result.value.data as any).options, fixture.data.options);
});
