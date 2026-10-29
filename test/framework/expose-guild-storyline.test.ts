import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessGuildStorylineHomeRecordsClaimsAndReplay|TestRobotBusinessGuildStorylineChallengeSettlementRollbackAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_GUILD_STORYLINE(?:_CHALLENGE)?_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
for (const op of ['guild.storyline-home', 'guild.storyline-records', 'guild.storyline-challenge', 'guild.storyline-claim']) assert.ok(rows.some(row => row.op === op && row.envelope.data.success && row.envelope.data.branch === 'business'), op);
assert.ok(rows.some(row => row.op === 'guild.storyline-claim' && row.envelope.data.data?.partial === true));
const action: Record<string, string> = { 'guild.storyline-home': 'get_guild_storyline', 'guild.storyline-records': 'get_guild_storyline_records', 'guild.storyline-challenge': 'challenge_guild_storyline', 'guild.storyline-claim': 'claim_guild_storyline_rewards' };
test('宗门主线保留状态、战斗和部分领奖回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action[current.op], {}), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any; const source = current.envelope.data;
    assert.equal(result.success, source.success);
    if (source.success && source.branch === 'business') {
      if (current.op === 'guild.storyline-home') { assert.deepEqual(result.result.claimableStages, source.data.claimableStages); assert.equal(result.result.home.canChallenge, source.data.home.canChallenge); }
      if (current.op === 'guild.storyline-records') assert.deepEqual(result.result.records, source.data.records);
      if (current.op === 'guild.storyline-challenge') assert.equal(result.result.reward.damageDealt, source.data.reward.damageDealt);
      if (current.op === 'guild.storyline-claim') assert.deepEqual(result.result, source.data);
    } else assert.equal(result.result, undefined);
    await call(); if (current.op.endsWith('-home') || current.op.endsWith('-records')) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
  }
});
