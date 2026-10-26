import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import claimFirst from '../src/response-apps/ranking/claimFirst/app';
import claimMonthly from '../src/response-apps/ranking/claimMonthly/app';

test('ranking rewards default to one bulk write, retain single selection, and reject invalid arguments without writes', async t => {
  mockBackendConfig(t, { api_url: 'https://ranking.test', robot_auth_token: 'test-only-token' });
  const calls: Array<{ url: string; data?: string; headers: Record<string, string> }> = [];
  t.mock.method(axios, 'create', () => ({ request: async (options: typeof calls[number]) => {
    calls.push(options);
    return { status: 200, headers: {}, data: JSON.stringify({ data: { claimedCount: 2, ranking: 3, rewardTexts: ['灵石 × 10'] } }) };
  } }));
  const request = { requestId: 'ranking-message', idempotencyKey: 'ranking-message-key' };
  for (const entry of [
    { command: '领取首通奖励', app: claimFirst, bulkPath: '/tower/rank-rewards/first/claim-all', singlePath: '/tower/rank-rewards/first/3/claim' },
    { command: '领取月度奖励', app: claimMonthly, bulkPath: '/tower/rank-rewards/monthly/claim', singlePath: '/tower/rank-rewards/monthly/claim' }
  ]) {
    for (const suffix of ['', '   ', ' 全部', ' all']) {
      const before = calls.length;
      const result = await entry.app({ bid: 'player', uid: 1, messageText: `/${entry.command}${suffix}`, request });
      assert.equal(result.code, 'BATCH_SUCCESS');
      assert.equal(calls.length, before + 1);
      const call = calls.at(-1)!;
      assert.equal(new URL(call.url).pathname, `/api/v1/players/1${entry.bulkPath}`);
      assert.equal(call.headers['idempotency-key'], request.idempotencyKey);
      if (entry.app === claimMonthly) {
        assert.deepEqual(JSON.parse(call.data!), {});
      }
    }
    const before = calls.length;
    const single = await entry.app({ bid: 'player', uid: 1, messageText: `/${entry.command} 3`, request });
    assert.equal(single.code, 'SUCCESS');
    assert.equal(calls.length, before + 1);
    assert.equal(new URL(calls.at(-1)!.url).pathname, `/api/v1/players/1${entry.singlePath}`);
    if (entry.app === claimMonthly) {
      assert.deepEqual(JSON.parse(calls.at(-1)!.data!), { rewardId: 3 });
    }
    for (const invalid of ['0', '-1', '1.5', '3abc', '未知', '全部 3', '3 4', '9007199254740992']) {
      const before = calls.length;
      assert.deepEqual(await entry.app({ bid: 'player', uid: 1, messageText: `/${entry.command} ${invalid}`, request }), { code: 'PARAM_ERROR' });
      assert.equal(calls.length, before);
    }
    const beforeMissingKey = calls.length;
    const missingKey = await entry.app({ bid: 'player', uid: 1, messageText: `/${entry.command}` });
    assert.equal(missingKey.code, 'FAILED');
    assert.equal(calls.length, beforeMissingKey);
  }
});
