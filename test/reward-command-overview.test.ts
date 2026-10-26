import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import daily from '../src/response-apps/signIn/daily/app';
import newcomer from '../src/response-apps/signIn/newcomer/app';
import celestial from '../src/response-apps/signIn/celestial/app';
import monthCard from '../src/response-apps/monthCard/claim/app';
import { getFirstRechargeClaimData } from '../src/response-apps/recharge/firstRechargeClaim/app';
import { getViewCodeData } from '../src/response-apps/referral/viewCode/app';
import { getCountRulesData } from '../src/response-apps/referral/rewardRules/count/app';
import { getRealmRulesData } from '../src/response-apps/referral/rewardRules/realm/app';
import { getVipRulesData } from '../src/response-apps/referral/rewardRules/vip/app';

const request = { requestId: 'test', idempotencyKey: 'message-1' };
const setup = (t: Parameters<typeof mockBackendConfig>[0], value: unknown) => {
  mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token', api_timeout_ms: 10000 });
  const calls: unknown[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (config: unknown) => { calls.push(config); return { status: 200, headers: {}, data: JSON.stringify({ data: value }) }; } }));
  return calls;
};

for (const [scope, run] of [['daily', daily], ['newcomer', newcomer], ['celestial', celestial]] as const) {
  test(`${scope} returns original ritual alongside rewards with one request`, async t => {
    const calls = setup(t, { accumulatedDays: 1, expireDate: '2026-11-01', signedSlots: ['早'], issued: [], ritualText: '原寄语' });
    const result = await run({ bid: 'bid', uid: 1, request });
    assert.equal(result.code, 'OK');
    assert.equal(result.data.ritualText, '原寄语');
    assert.equal(calls.length, 1);
    assert.match(JSON.stringify(calls), new RegExp(`${scope}/with-ritual`));
  });
}

for (const [name, run] of [['code', getViewCodeData], ['count', getCountRulesData], ['realm', getRealmRulesData], ['vip', getVipRulesData]] as const) {
  test(`${name} invitation page synchronizes and reads within one POST`, async t => {
    const panel = { pendingCount: 0, groups: [] };
    const calls = setup(t, { code: 'TEST1', inviteCount: 0, inviteLimit: 10, pendingRewards: 0, rulePanels: { count: panel, realm_level: panel, vip_level: panel } });
    assert.equal((await run('bid', 1, request)).code, 'OK');
    assert.equal(calls.length, 1);
    assert.match(JSON.stringify(calls), /overview\/sync/);
  });
}

test('month card uses one request and preserves no-card and committed-status-failure branches', async t => {
  const calls = setup(t, { beforeTotal: 0, claim: null, status: null });
  assert.equal((await monthCard({ bid: 'bid', uid: 1, request })).code, 'NO_MONTH_CARD');
  assert.equal(calls.length, 1);
});

test('first recharge invalid tier and claim failure remain distinct with one request', async t => {
  const calls = setup(t, { validTiers: [1, 6], validTier: false, result: null });
  assert.deepEqual(await getFirstRechargeClaimData(1, 'bid', '/领取礼包奖励 30', request), { code: 'INVALID_TIER', validTiers: [1, 6] });
  assert.equal(calls.length, 1);
});

for (const statusFailed of [false, true]) {
  test(`month card committed reward ${statusFailed ? 'post-read failure' : 'success'} preserves original UI outcome`, async t => {
    const status = { total: 30, claimableCount: 0, claimedCount: 1, upcomingCount: 29, dailyRewards: { spiritCrystal: 1, mentalPillItemId: 1, mentalPillQuantity: 1, qiPillItemId: 2, qiPillQuantity: 1 }, records: [] };
    const calls = setup(t, { beforeTotal: 30, claim: { days: 1, rewards: { spiritCrystal: 1, mentalPill: 1, qiPill: 1 } }, status: statusFailed ? null : status, statusError: statusFailed ? 'storage unavailable' : undefined });
    const result = await monthCard({ bid: 'bid', uid: 1, request });
    assert.equal(result.code, statusFailed ? 'CLAIM_FAILED' : 'OK');
    if (result.code === 'OK') { assert.equal(result.data.status.claimedCount, 1); }
    assert.equal(calls.length, 1);
  });
}

for (const failed of [false, true]) {
  test(`first recharge ${failed ? 'business rejection' : 'reward'} preserves result in one response`, async t => {
    const calls = setup(t, { validTiers: [1, 6], validTier: true, result: failed ? null : { issued: [{ type: 'item', name: '元力丹', amount: 1 }] }, claimError: failed ? '该档位尚未解锁' : undefined });
    const result = await getFirstRechargeClaimData(1, 'bid', '/领取礼包奖励 1', request);
    assert.equal(result.code, failed ? 'FAILED' : 'SUCCESS');
    if (result.code === 'FAILED') { assert.equal(result.error, '该档位尚未解锁'); }
    assert.equal(calls.length, 1);
  });
}
