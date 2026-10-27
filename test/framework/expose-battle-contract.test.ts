import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const names = ['TestRobotBusinessExposeTowerContract', 'TestRobotBusinessWorldBossClaimPartialSettlementAndReplay', 'TestRobotBusinessWorldBossChallengeAttemptsPartialAndReplay'];
const output = goTestFixture(['test', './internal/httpapi', '-run', `^(${names.join('|')})$`, '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/ROBOT_(?:DEMON_TOWER_(?:CHALLENGE|ACTION|QUERY)|WORLD_BOSS_(?:CHALLENGE|CLAIM))_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(match => ({ operation: match[1], bid: match[2], envelope: JSON.parse(match[3]) }));
assert.ok(fixtures.length > 20);
const specs = [
  { action: 'challenge_world_boss', operation: 'world-boss.challenge', input: {}, mode: 'single' },
  { action: 'challenge_world_boss_all', operation: 'world-boss.challenge', input: {}, mode: 'all' },
  { action: 'claim_world_boss_rewards', operation: 'world-boss.reward-claim', input: {} },
  { action: 'challenge_demon_tower', operation: 'demon-tower.challenge', input: { stars: 3 } },
  { action: 'select_demon_tower_buff', operation: 'demon-tower.buff', input: { buffKey: 'hp', count: 1 } },
  { action: 'reset_demon_tower', operation: 'demon-tower.reset', input: {} },
  { action: 'sweep_demon_tower', operation: 'demon-tower.sweep', input: {} },
  { action: 'get_demon_tower', operation: 'demon-tower.info', input: {} }
];
for (const spec of specs) test(`${spec.action}: 真实服务端结算及拒绝回执`, async t => {
  const query = spec.action === 'get_demon_tower';
  const rows = fixtures.filter(row => row.operation === spec.operation && row.envelope.data.data?.outcome !== 'usage' && (!spec.mode || !row.envelope.data.data || row.envelope.data.data.mode === spec.mode) && (!query || (row.envelope.data.success && row.envelope.data.branch === 'business')));
  assert.ok(rows.length > 0, spec.action);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const identity = request.url.endsWith('/robot/identity');
    const response = query ? { data: identity ? current.envelope.data.middleware.identity : current.envelope.data.data } : current.envelope;
    assert.equal(request.method, query ? 'GET' : 'POST');
    if (!query) assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${spec.operation}`);
    return { status: 200, headers: {}, data: JSON.stringify(response) };
  } }));
  let successes = 0;
  for (current of rows) {
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: current.bid }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', spec.action, spec.input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, `${spec.action} ${JSON.stringify(result.value)}`);
    if (!result.value.ok) continue;
    const actual = result.value.data as any;
    const server = current.envelope.data;
    if (query) {
      assert.deepEqual(actual.access, server.data.access);
      assert.equal(actual.info?.currentLayer, server.data.info?.currentLayer);
      assert.equal(actual.info?.pendingBuffSelections, server.data.info?.pendingBuffSelections);
      successes++;
      continue;
    }
    assert.equal(actual.success, server.success);
    assert.equal(actual.branch, server.branch);
    if (!server.success || server.branch !== 'business') { assert.equal(actual.result, undefined); continue; }
    successes++;
    const data = server.data.outcome === 'result' ? server.data.data : server.data;
    for (const key of ['success', 'totalDamageDealt', 'damageDealt', 'attemptsUsed', 'remainingAttempts', 'logId', 'starsEarned', 'scoreEarned', 'nextLayer', 'remainingBuffSelections', 'totalStone', 'totalCrystal', 'layersSwept', 'resetsUsed']) if (key in data) assert.equal(actual.result[key], data[key]);
    if (spec.mode === 'all') assert.equal(actual.result.rounds.length, data.rounds.length);
    if (spec.action === 'claim_world_boss_rewards') assert.deepEqual(actual.result.items, data.items);
  }
  assert.ok(successes > 0, spec.action);
});
