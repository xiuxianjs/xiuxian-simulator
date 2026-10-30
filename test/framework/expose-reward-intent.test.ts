import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessExposeRewardsContracts|TestRobotBusinessActivityPointsQueriesClaimsAndReplay)$/^(daily-all|weekly-all|achievements)$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/(?:EXPOSE_REWARDS_HTTP=|ROBOT_ACTIVITY_POINTS_RESPONSE=)([^|]+)\|(?:player\|)?(\{.+)/g)]
  .map(match => ({ operation: match[1], envelope: JSON.parse(match[2]) }));
test('同一消息中的新一键领取与原请求重试使用不同幂等键', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let operation = '';
  let envelope: any;
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [action, op] of [
    ['claim_all_daily_activity', 'activity-points.claim-all-daily'],
    ['claim_all_weekly_activity', 'activity-points.claim-all-weekly'],
    ['claim_all_achievements', 'achievements.claim-all'],
    ['claim_all_emails', 'emails.claim-all']
  ]) {
    operation = op;
    envelope = fixtures.find(row => row.operation === (op === 'emails.claim-all' ? 'activity-points.claim-all-daily' : op) && row.envelope.data.success && row.envelope.data.branch === 'business')?.envelope;
    assert.ok(envelope, action);
    envelope = structuredClone(envelope);
    if (op === 'emails.claim-all') envelope.data.data = { claimed: 1, skipped: 2, total: 3 };
    const call = (intentId: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, { intentId }), 'ai-plugin');
    assert.equal((await call('first')).value.ok, true);
    const first = keys.at(-1);
    assert.equal((await call('first')).value.ok, true);
    assert.equal(keys.at(-1), first);
    assert.equal((await call('second')).value.ok, true);
    assert.notEqual(keys.at(-1), first);
    const before = keys.length;
    assert.equal((await call('invalid intent')).value.ok, false);
    assert.equal(keys.length, before);
  }
});
