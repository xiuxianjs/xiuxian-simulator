import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import overviewApp from '../src/response-apps/comeback/native/app';
import claimApp from '../src/response-apps/comeback/nativeClaim/app';
import { parseNativeComebackOverview, parseNativeComebackClaim } from '../src/api/bot/native-comeback';

test('original v1 comeback Apps preserve paths and parse real domain receipts after parser extraction', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessNativeComebackEntryOverviewClaimAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_NATIVE_COMEBACK_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));
  mockBackendConfig(t, { api_url: 'https://native-contract.test', robot_auth_token: 'test-token' });
  let status = 200;
  let payload: unknown;
  const calls: { url: string; method: string }[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (call: { url: string; method: string }) => {
    calls.push(call);
    return { status, headers: {}, data: JSON.stringify(status === 200 ? { data: payload } : { error: { code: 'CONFLICT', message: '原本服回归拒绝' } }) };
  } }));
  const request = { requestId: 'native-contract', idempotencyKey: 'native-contract' };
  for (const row of receipts.filter(r => r.result.success)) {
    payload = row.result.data; calls.length = 0;
    const claim = row.op === 'native-comeback.claim';
    const result = claim ? await claimApp({ bid: 'player', uid: 1, request }) : await overviewApp({ bid: 'player', uid: 1 });
    assert.deepEqual(result, { code: 'OK', data: claim ? parseNativeComebackClaim(payload) : parseNativeComebackOverview(payload) });
    assert.deepEqual(calls.map(c => [c.method.toUpperCase(), new URL(c.url).pathname]), [[claim ? 'POST' : 'GET', `/api/v1/players/1/native-comeback${claim ? '/claim' : ''}`]]);
  }
  status = 409;
  assert.deepEqual(await overviewApp({ bid: 'player', uid: 1 }), { code: 'LOAD_FAILED', data: { message: '原本服回归拒绝' } });
  assert.deepEqual(await claimApp({ bid: 'player', uid: 1, request }), { code: 'FAILED', data: { message: '原本服回归拒绝' } });
});
