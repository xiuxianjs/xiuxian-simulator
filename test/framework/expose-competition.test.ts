import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessCompetition(QueriesScopePhasesFailuresAndReplay|TeamActionsPhasesPermissionsRollbackAndReplay|MemberAddTargetsCandidatesTransactionsAndReplay|ChallengeSettlementRollbackAndReplay|RewardAllSeasonsRollbackAndReplay|BetsTransactionsLimitsAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_COMPETITION_\w+_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) })).filter(row => row.envelope.data.success);
test('宗门大比 Expose 复用服务端回执并保持请求和重试语义', async t => {
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
  const cases = [
    ['competition.home', 'get_guild_competition', {}, {}, '', true],
    ['competition.candidates', 'get_guild_competition_candidates', {}, {}, '', true],
    ['competition.promotion-teams', 'get_guild_competition_promotion_teams', {}, {}, '', true],
    ['competition.bets', 'get_guild_competition_bets', {}, {}, '', true],
    ['competition.battles', 'get_guild_competition_battles', {}, { pageText: '1' }, '', true],
    ['competition.battle-detail', 'get_guild_competition_battle', { battleId: 1 }, { battleIdText: '1' }, '', true],
    ['competition.apply', 'apply_guild_competition', {}, {}, 'result', false],
    ['competition.team-clear', 'clear_guild_competition_team', {}, {}, 'result', false],
    ['competition.member-remove', 'remove_guild_competition_member', { position: 6 }, { positionText: '6' }, 'result', false],
    ['competition.position-adjust', 'move_guild_competition_member', { fromPosition: 2, toPosition: 3 }, { positions: { fromPosition: 2, toPosition: 3 } }, 'result', false],
    ['competition.member-add', 'get_guild_competition_members', {}, { mode: 'list', pageText: '1' }, 'list', true],
    ['competition.member-add', 'add_guild_competition_member', { userId: 8, position: 1 }, { mode: 'direct', target: { uid: 8 }, position: 1 }, 'result', false],
    ['competition.challenge', 'challenge_guild_competition', { guildId: 2 }, { target: { defenderGuildId: 2 } }, 'result', false],
    ['competition.reward-claim', 'claim_guild_competition_rewards', {}, {}, '', false],
    ['competition.bet', 'place_guild_competition_bet', { guildId: 9, amount: 300 }, { mode: 'bet', guildId: 9, amount: 300 }, 'result', false],
    ['competition.follow-bet', 'follow_guild_competition_bet', { amount: 200 }, { mode: 'bet', guildId: null, amount: 200 }, 'result', false]
  ] as const;
  for (const [operation, action, input, expected, outcome, read] of cases) {
    op = operation; args = expected;
    envelope = structuredClone(fixtures.filter(row => row.op === op && (!outcome || row.envelope.data.data?.outcome === outcome)).at(-1)?.envelope);
    assert.ok(envelope, action);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    if (result.value.ok && action === 'place_guild_competition_bet') assert.equal((result.value.data as any).result.receipt.currency.changeAmount, -300);
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
  }
});
