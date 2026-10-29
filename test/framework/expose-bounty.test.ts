import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessBountyListsAndClaimBoundaries|TestRobotBusinessBountyAcceptWinLossRollbackAndSlotLost|TestRobotBusinessBountyPublishV1TargetsCostsAndRollback|TestRobotBusinessBountyContinueWinAndLoss)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const regular = [...output.matchAll(/ROBOT_BOUNTY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], args: JSON.parse(row[2]), envelope: JSON.parse(row[4]) }));
const published = [...output.matchAll(/ROBOT_BOUNTY_PUBLISH_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: 'bounty.publish', args: JSON.parse(row[1]), envelope: JSON.parse(row[3]) }));
const entries = [...regular, ...published];

test('悬赏操作保留服务端战斗、待领和发布结算结果', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let expectedArgs: any; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, expectedArgs); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const cases: Array<{ op: string; action: string; input: any; args: any; select: (row: any) => boolean; read: boolean }> = [
    { op: 'bounty.list', action: 'get_bounties', input: {}, args: { page: '1' }, read: true, select: row => row.envelope.data.data?.total > 0 && row.args.page === '1' },
    { op: 'bounty.publish', action: 'get_bounty_publish_policy', input: {}, args: { mode: 'usage' }, read: true, select: row => row.envelope.data.data?.outcome === 'policy' },
    { op: 'bounty.publish', action: 'publish_bounty', input: { targetUid: 2, amount: 1000, maxCompletions: 3 }, args: { mode: 'publish', target: { uid: 2 }, amount: '1000', maxCompletions: '3' }, read: false, select: row => row.envelope.data.data?.outcome === 'published' },
    { op: 'bounty.accept', action: 'accept_bounty', input: { bountyId: 1 }, args: { bountyId: '1' }, read: false, select: row => row.envelope.data.data?.battleWon === true && row.envelope.data.data?.completionId },
    { op: 'bounty.accept', action: 'continue_bounty_battle', input: { bountyId: 1 }, args: { bountyId: '1', continueBattle: true }, read: false, select: row => row.args.continueBattle && row.envelope.data.data?.won === true },
    { op: 'bounty.claim', action: 'get_pending_bounty_rewards', input: {}, args: { mode: 'list', bountyId: null }, read: true, select: row => row.envelope.data.data?.outcome === 'list' && row.envelope.data.data.pending.length > 0 },
    { op: 'bounty.claim', action: 'claim_bounty_reward', input: { bountyId: 1 }, args: { mode: 'claim', bountyId: '1' }, read: false, select: row => row.envelope.data.data?.outcome === 'claimed' }
  ];
  for (const item of cases) {
    op = item.op; expectedArgs = item.args;
    const fixture = entries.find(row => row.op === op && row.envelope.data.success && item.select(row)); assert.ok(fixture, item.action); envelope = fixture.envelope;
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', item.action, item.input), 'ai-plugin');
    const run = await call(); assert.equal(run.value.ok, true, `${item.action}: ${JSON.stringify(run.value)}`);
    if (run.value.ok) {
      const result = (run.value.data as any).result;
      if (item.action === 'accept_bounty') assert.equal(result.completionId, envelope.data.data.completionId);
      if (item.action === 'continue_bounty_battle') assert.equal(result.won, envelope.data.data.won);
      if (item.action === 'claim_bounty_reward') assert.equal(result.rewardAmount, envelope.data.data.rewardAmount);
      if (item.action === 'publish_bounty') assert.equal(result.totalCost, envelope.data.data.data.totalCost);
      if (item.action === 'get_pending_bounty_rewards') assert.deepEqual(result.pending, envelope.data.data.pending);
    }
    await call(); if (item.read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
  }
  op = 'bounty.accept'; expectedArgs = { bountyId: '1' };
  for (const win of [false, true]) {
    const fixture = entries.find(row => row.op === op && row.envelope.data.success &&
      row.envelope.data.data?.battleWon === win && !row.envelope.data.data?.completionId);
    assert.ok(fixture, `battleWon=${win} without completion`); envelope = fixture.envelope;
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'accept_bounty', { bountyId: 1 }), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) {
      const result = (run.value.data as any).result;
      assert.equal(result.battleWon, win); assert.equal(result.completionId, undefined);
    }
  }

});
