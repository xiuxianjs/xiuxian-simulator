import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { getBackendVipPrivileges } from '../src/api/bot/vip-privileges-queries';
import { parseBackendMonthCardDailyRewards } from '../src/api/bot/month-card-daily-rewards';
import { claimBackendMonthCardOverview } from '../src/api/bot/reward-claim-overview';
import { BackendAPIError, requestBackend } from '../src/api/bot/client';
import { mockBackendConfig } from './backend-config-helper';

type Fixture = { operation: string; uid: number; data?: Record<string, unknown>; error?: { code: string; message: string } };

test('actual month card settlement and stored VIP privileges pass robot SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestMembershipResponseContractSerialization$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 1024 * 1024
  });
  const match = output.match(/MEMBERSHIP_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'Go membership responses missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Fixture>;
  let payload: unknown;
  let status = 200;
  const server = createServer((_request, response) => {
    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(payload));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'local-membership-contract' });
  const context = { requestId: 'membership-contract', idempotencyKey: 'membership-contract' };
  const run = async (entry: Fixture) => {
    if (entry.operation === 'vip') return getBackendVipPrivileges('bid', entry.uid);
    if (entry.operation === 'overview') return claimBackendMonthCardOverview('bid', entry.uid, context);
    return parseBackendMonthCardDailyRewards(await requestBackend('bid', 'get_players_id_recharge_month_card_daily_rewards', { path: { id: entry.uid } }));
  };
  try {
    for (const [key, entry] of Object.entries(fixtures)) {
      if (entry.error) {
        status = 409;
        payload = { error: entry.error };
        await assert.rejects(() => run(entry), (error: unknown) => error instanceof BackendAPIError && error.code === entry.error?.code && error.message === entry.error?.message);
        continue;
      }
      status = 200;
      payload = { data: entry.data };
      const expected = { ...entry.data };
      assert.deepEqual(JSON.parse(JSON.stringify(await run(entry))), expected, key);
    }
    const vip = fixtures.vipStored.data as Record<string, unknown>;
    const levels = vip.levelEligibility as Record<string, unknown>[];
    const days = vip.checkinDoubleDays as Record<string, unknown>;
    const invalidIntegers = [undefined, null, '1', 0.5, Number.MAX_SAFE_INTEGER + 1];
    for (const invalid of invalidIntegers) {
      for (const field of ['vipLevel', 'totalRechargeAmount', 'pillDailyLimit']) {
        payload = { data: { ...vip, [field]: invalid } };
        await assert.rejects(() => run(fixtures.vipStored), /特权接口缺少数值/);
      }
      for (const field of ['minLevel', 'needAmount']) {
        payload = { data: { ...vip, levelEligibility: levels.map((row, index) => index === 0 ? { ...row, [field]: invalid } : row) } };
        await assert.rejects(() => run(fixtures.vipStored), /特权接口缺少数值/);
      }
      payload = { data: { ...vip, checkinDoubleDays: { ...days, vip2_double_days: [invalid] } } };
      await assert.rejects(() => run(fixtures.vipStored), /特权接口缺少数值/);
    }
    // int64 recharge values stay signed; no client rule clamps historical balances.
    payload = { data: { ...vip, totalRechargeAmount: -1 } };
    assert.equal((await getBackendVipPrivileges('bid', 1)).totalRechargeAmount, -1);
    const calendar = fixtures.calendarBefore.data as Record<string, unknown>;
    for (const field of ['total', 'claimableCount', 'claimedCount', 'upcomingCount']) {
      for (const invalid of invalidIntegers) {
        payload = { data: { ...calendar, [field]: invalid } };
        await assert.rejects(() => run(fixtures.calendarBefore), /月卡每日奖励响应不完整/);
      }
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
