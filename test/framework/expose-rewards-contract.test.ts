import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessExposeRewardsContracts|TestRobotBusinessActivityPointsQueriesClaimsAndReplay)$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/(?:EXPOSE_REWARDS_HTTP=|ROBOT_ACTIVITY_POINTS_RESPONSE=)([^|]+)\|(?:player\|)?(\{.+)/g)]
  .map(match => ({ operation: match[1], envelope: JSON.parse(match[2]) }));
const specs = [
  ['get_daily_activity', 'activity-points.daily'], ['get_weekly_activity', 'activity-points.weekly'],
  ['claim_daily_activity', 'activity-points.claim-daily'], ['claim_weekly_activity', 'activity-points.claim-weekly'],
  ['claim_all_daily_activity', 'activity-points.claim-all-daily'], ['claim_all_weekly_activity', 'activity-points.claim-all-weekly'],
  ['claim_month_card_rewards', 'membership.claim-month-card'], ['claim_all_achievements', 'achievements.claim-all']
];
for (const [action, operation] of specs) test(`${action}: 真实 Go 奖励契约、拒绝及部分领取`, async t => {
  const rows = fixtures.filter(row => row.operation === operation);
  assert.ok(rows.length > 0, action);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${operation}`);
    assert.ok(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  let successes = 0;
  let partial = 0;
  for (current of rows) {
    const input = operation === 'activity-points.claim-daily' || operation === 'activity-points.claim-weekly' ? { requiredPoints: 10 } : {};
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (!result.value.ok) continue;
    const actual = result.value.data as any;
    const server = current.envelope.data;
    assert.equal(actual.success, server.success);
    assert.deepEqual(actual.replies, server.middleware.replies);
    if (!server.success) { assert.equal(actual.result, undefined); continue; }
    successes++;
    const data = server.data;
    if (operation.startsWith('activity-points.')) {
      if (operation === 'activity-points.daily' || operation === 'activity-points.weekly') {
        assert.deepEqual(actual.result, data);
      } else if (operation.includes('claim-all-')) {
        assert.deepEqual(actual.result, {
          claimed: data.claimed.map((item: any) => ({ userName: item.userName, requiredPoints: item.requiredPoints, issued: item.issued,
            ...(item.treasureMapBackfillOnly !== undefined ? { treasureMapBackfillOnly: item.treasureMapBackfillOnly } : {}),
            ...(item.treasureMaps != null ? { treasureMaps: item.treasureMaps } : {}),
            ...(item.treasureMapsUnavailableReason !== undefined ? { treasureMapsUnavailableReason: item.treasureMapsUnavailableReason } : {}) })),
          partial: data.partial,
          ...(data.userName !== undefined ? { userName: data.userName } : {}),
          ...(data.taskRewards !== undefined ? { taskRewards: data.taskRewards } : {}),
          ...(data.error !== undefined ? { error: data.error } : {})
        });
      } else {
        assert.deepEqual(actual.result, { userName: data.userName, requiredPoints: data.requiredPoints, issued: data.issued,
          ...(data.treasureMapBackfillOnly !== undefined ? { treasureMapBackfillOnly: data.treasureMapBackfillOnly } : {}),
          ...(data.treasureMaps != null ? { treasureMaps: data.treasureMaps } : {}),
          ...(data.treasureMapsUnavailableReason !== undefined ? { treasureMapsUnavailableReason: data.treasureMapsUnavailableReason } : {}) });
      }
      if (data.partial) partial++;
    } else if (operation === 'membership.claim-month-card') {
      assert.equal(actual.result.days, data.claim.days);
      assert.equal(actual.result.rewards.spiritCrystal, data.claim.rewards.spiritCrystal);
      assert.equal(actual.result.rewards.huanHunDan, data.claim.rewards.mentalPill);
      assert.equal(actual.result.rewards.yangShenDan, data.claim.rewards.qiPill);
      assert.equal(actual.result.status.claimedCount, data.status.claimedCount);
    } else {
      assert.equal(actual.result.locked, false);
      assert.equal(actual.result.data.claimedCount, data.data.claimedCount);
      assert.equal(actual.result.data.claimed[0].rewardText, data.data.claimed[0].issued.map((item: any) => `${item.name}×${item.amount}`).join('、'));
      assert.equal(actual.result.data.claimed[0].achievementName, data.data.claimed[0].achievementName);
    }
  }
  assert.ok(successes > 0, action);
  if (operation.includes('claim-all-')) assert.ok(partial > 0, '必须覆盖部分已结算结果');
});
