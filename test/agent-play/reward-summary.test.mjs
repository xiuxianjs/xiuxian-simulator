import test from 'node:test';
import assert from 'node:assert/strict';
import { qualifyRewardSummary, recordRewardObservation, qualifyUnexecutedRewardClaim, rewardSettlement, pendingActivityRewards } from '../../src/agent-play/reward-summary.ts';

test('partial reward queries cannot become a global completion claim; recovery uses current results', () => {
  const states = new Map();
  recordRewardObservation(states, 'get_daily_activity', { ok: true, data: { success: true } });
  recordRewardObservation(states, 'get_emails', { ok: true, data: null });
  assert.equal(states.get('get_emails'), false);
  recordRewardObservation(states, 'get_emails', { ok: false });
  recordRewardObservation(states, 'get_achievement_overview', { ok: true, data: { success: false } });
  const reply = '灵石 ×11 已到账。这次没有遗漏任何可领取的项目。奖励已经全部领完。\n[[奖励全部领完]]';
  const result = qualifyRewardSummary(reply, states);
  assert.match(result, /灵石 ×11 已到账/);
  assert.match(result, /邮件、成就本轮尚未核对清楚/);
  assert.doesNotMatch(result, /没有遗漏/);
  assert.match(qualifyRewardSummary('目前确实没有其他能领的免费奖励了。', states), /本轮尚未核对清楚/);
  assert.ok(result.endsWith('[[奖励全部领完]]'), 'Never alter an input payload');
  const cautious = '不能说奖励全部领完。邮件尚未核对。';
  assert.equal(qualifyRewardSummary(cautious, states), cautious);
  const code = '```json\n{"text":"奖励全部领完"}\n```';
  assert.equal(qualifyRewardSummary(code, states), code);
  recordRewardObservation(states, 'get_emails', { ok: true, data: { list: [] } });
  recordRewardObservation(states, 'get_achievement_overview', { ok: true, data: { success: true } });
  assert.equal(qualifyRewardSummary('本页奖励已领取。', states), '本页奖励已领取。');
  assert.equal(qualifyRewardSummary('灵石 ×11 已到账。', new Map()), '灵石 ×11 已到账。');
});


test('an eligibility query cannot be reported as newly issued rewards', () => {
  const claim = '10 积分那档可领取，已直接领到手，灵晶×11。';
  assert.match(qualifyUnexecutedRewardClaim(claim, []), /尚未执行领取/);
  assert.doesNotMatch(qualifyUnexecutedRewardClaim(claim, []), /灵晶/);
  assert.match(qualifyUnexecutedRewardClaim('那我就只领这一只。', []), /尚未执行领取/);
  assert.match(qualifyUnexecutedRewardClaim('已领取并确认到账。', []), /尚未执行领取/);
  assert.equal(qualifyUnexecutedRewardClaim(claim, [['claim_email', { ok: true, data: { success: true, branch: 'business', result: { issued: [{ name: '灵石', amount: 11 }] } } }]]), claim);
  for (const text of ['主线宝箱上次已领取。', '已经领过的不要重复领。', '这次没有领取奖励。', '[[本次领取了奖励]]', '```text\n已到账\n```']) {
    assert.equal(qualifyUnexecutedRewardClaim(text, []), text);
  }
});

const success = result => ({ ok: true, data: { success: true, branch: 'business', result } });
const claimText = '本轮奖励已经到账。';
for (const [label, action, receipt, expected] of [
  ['transport unknown', 'claim_email', { ok: false, error: { outcome: 'unknown' } }, /不能确认奖励到账/],
  ['business rejected', 'claim_email', { ok: true, data: { success: false, branch: 'business' } }, /不能确认奖励到账/],
  ['middleware interrupted', 'claim_email', { ok: true, data: { success: true, branch: 'middleware' } }, /不能确认奖励到账/],
  ['achievement locked', 'claim_all_achievements', success({ locked: true }), /没有显示新增奖励/],
  ['emails skipped', 'claim_all_emails', success({ claimed: 0, skipped: 2, total: 2 }), /没有显示新增奖励/],
  ['checkins skipped', 'checkin_all', success([{ status: 'skip', name: '日常签到' }]), /没有显示新增奖励/],
  ['empty activity', 'claim_all_daily_activity', success({ claimed: [], taskRewards: [], partial: false }), /没有显示新增奖励/],
  ['missing payload', 'claim_email', success(undefined), /不能确认奖励到账/]
]) test(`reward settlement does not treat ${label} as newly issued`, () => {
  const receipts = [[action, receipt]];
  assert.equal(rewardSettlement(receipts).confirmed, false);
  assert.match(qualifyUnexecutedRewardClaim(claimText, receipts), expected);
});

test('partial settlement preserves confirmed awards and does not declare complete success', () => {
  const receipts = [['claim_all_daily_activity', success({ claimed: [{ issued: [{ name: '灵石', amount: 11 }] }], partial: true, error: 'later threshold failed' })]];
  const result = qualifyUnexecutedRewardClaim('灵石 ×11 已到账。本轮全部成功，没有部分失败。', receipts);
  assert.match(result, /灵石 ×11 已到账/);
  assert.match(result, /只有部分领取结果得到确认/);
  assert.doesNotMatch(result, /没有部分失败/);
  const later = [...receipts, ['claim_all_daily_activity', { ok: false }]];
  assert.equal(rewardSettlement(later).confirmed, true, 'A later failure cannot erase the previous receipt');
  for (const [action, payload] of [
    ['claim_all_emails', { claimed: 1 }],
    ['claim_storyline_chest', { success: true, claimedIndexes: [1], totalReward: 50 }],
    ['claim_all_achievements', { locked: false, data: { claimedCount: 1 } }],
    ['checkin_all', [{ name: '日常签到', status: 'done' }, { name: '宗门签到', status: 'skip' }]],
    ['claim_all_daily_activity', { claimed: [], taskRewards: [{ name: '灵石', amount: 11 }], partial: false }],
    ['claim_weekly_activity', { issued: [], treasureMaps: { alreadyGranted: false, quantity: 1 } }]
  ]) assert.equal(rewardSettlement([[action, success(payload)]]).confirmed, true, action);
  assert.equal(rewardSettlement([['claim_weekly_activity', success({ issued: [], treasureMaps: { alreadyGranted: true, quantity: 1 } })]]).confirmed, false);
});


test('current eligibility prompts completion only for unscoped explicit reward requests', () => {
 const observations = new Map([['get_daily_activity', success({ rewards: [{ canClaim: true }] })]]);
 assert.deepEqual(pendingActivityRewards('帮我领取奖励，不要购买或战斗', observations, []), ['get_daily_activity']);
 assert.deepEqual(pendingActivityRewards('满足条件的免费奖励直接领取', observations, []), ['get_daily_activity']);
 for (const request of ['如何领取奖励', '帮我领取奖励，只领签到', '帮我领取奖励，不要领取日常活跃', '帮我领取奖励，只领主线宝箱']) {
  assert.deepEqual(pendingActivityRewards(request, observations, []), []);
 }
 assert.deepEqual(pendingActivityRewards('帮我领取奖励', observations, [['claim_all_daily_activity', { ok: false, error: { outcome: 'unknown' } }]]), []);
 assert.deepEqual(pendingActivityRewards('帮我领取奖励', observations, [['claim_all_daily_activity', { ok: false, error: { outcome: 'not_started' } }]]), ['get_daily_activity']);
 assert.deepEqual(pendingActivityRewards('帮我领取奖励', new Map([['get_daily_activity', { ok: false }]]), []), []);
});
