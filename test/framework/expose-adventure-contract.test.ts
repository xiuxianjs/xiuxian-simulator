import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const names = ['TestRobotBusinessStorylineChapterChestsV1ParityAndReplay', 'TestRobotBusinessStorylineAllChestsV1ParityAndReplay', 'TestRobotBusinessStorylineSweepV1ParityAndReplay', 'TestRobotBusinessDungeonChallengeSettlementRollbackAndReplay', 'TestRobotBusinessDungeonSweepsSettlementPartialAndReplay'];
const output = goTestFixture(['test', './internal/httpapi', '-run', `^(${names.join('|')})$`, '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 128 * 1024 * 1024
}).toString();
const fixtures: Array<{ action: string; operation: string; input: Record<string, unknown>; bid: string; result: any }> = [];
for (const match of output.matchAll(/ROBOT_STORYLINE_(SWEEP|CHAPTER_CHESTS|ALL_CHESTS)=(.+)/g)) {
  const row = JSON.parse(match[2]);
  const positive = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;
  let action: string, operation: string, input: Record<string, unknown>;
  if (match[1] === 'SWEEP') {
    const p = row.parsed;
    if (!row.callSDK || row.sdkError || row.bindingError || !positive(p?.chapterNumber) || !positive(p.stageNumber) || p.stageNumber > 4 || !positive(p.times) || p.times > 9999) continue;
    action = 'sweep_storyline'; operation = 'storyline.sweep'; input = p;
  } else if (match[1] === 'CHAPTER_CHESTS') {
    if (!row.valid || !positive(row.chapter) || (row.single && !positive(row.chest))) continue;
    action = row.single ? 'claim_storyline_chest' : 'claim_storyline_chapter_chests'; operation = 'storyline.chests-claim';
    input = { chapterNumber: row.chapter, ...(row.single ? { chestIndex: row.chest } : {}) };
  } else { action = 'claim_all_storyline_chests'; operation = 'storyline.chests-claim-all'; input = {}; }
  fixtures.push({ action, operation, input, bid: row.result.middleware.identity.bid, result: row.result });
}
for (const match of output.matchAll(/ROBOT_DUNGEON_(?:CHALLENGE|SWEEP)_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
  const result = JSON.parse(match[3]).data;
  if (result.data?.outcome === 'no_match') continue;
  const operation = match[1];
  const action = operation === 'dungeon.challenge' ? 'challenge_dungeon' : operation === 'dungeon.sweep' ? 'sweep_dungeon' : 'sweep_free_dungeons';
  const input = action === 'sweep_free_dungeons' ? {} : { dungeonName: '测试秘境', ...(action === 'sweep_dungeon' ? { times: 1 } : {}) };
  fixtures.push({ action, operation, input, bid: match[2], result });
}
assert.ok(fixtures.length > 100);
for (const action of ['challenge_dungeon', 'sweep_dungeon', 'sweep_free_dungeons', 'sweep_storyline', 'claim_storyline_chest', 'claim_storyline_chapter_chests', 'claim_all_storyline_chests']) test(`${action}: 实际 Go 结算、拒绝、重复领取及部分奖励`, async t => {
  const rows = fixtures.filter(row => row.action === action);
  assert.ok(rows.length > 0);
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    return { status: 200, headers: {}, data: JSON.stringify({ data: current.result }) };
  } }));
  let successful = 0;
  for (current of rows) {
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: current.bid }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, current.input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, `${action} ${JSON.stringify(current.input)} ${JSON.stringify(result.value)}`);
    if (!result.value.ok) continue;
    const actual = result.value.data as any;
    assert.equal(actual.success, current.result.success);
    assert.equal(actual.branch, current.result.branch);
    if (!current.result.success || current.result.branch !== 'business') { assert.equal(actual.result, undefined); continue; }
    successful++;
    const data = current.result.data.outcome === 'result' ? current.result.data.data : current.result.data;
    for (const key of ['won', 'experienceGained', 'spiritStoneGained', 'logId', 'totalTimes', 'totalExp', 'totalSpiritCost', 'totalReward', 'claimedCount', 'chapterNumber', 'stageNumber']) if (key in data) assert.equal(actual.result[key], data[key]);
    if (action === 'sweep_storyline') assert.deepEqual(actual.result.result, data.result);
    if (action === 'sweep_dungeon') assert.deepEqual(actual.result, data);
    if (action === 'challenge_dungeon') assert.deepEqual(actual.result.rewardsByUser, data.rewardsByUser);
    if (action.startsWith('claim_')) assert.deepEqual(actual.result, data);
  }
  assert.ok(successful > 0, action);
});
