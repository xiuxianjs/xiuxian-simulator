import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { executeProposalCommand } from '../src/response-apps/companion/propose/app';

const preflight = { initiatorName: '甲', target: { id: 2, name: '乙' }, oathItems: [{ itemId: 9, name: '白首盟书', quantity: 2, oathType: 'normal', desc: '' }], friends: [], currentPage: 1, totalPages: 1, totalCount: 0 };
for (const code of ['NOT_FOUND', 'NO_OATH_ITEMS', 'INDEX_INVALID', 'SELECTION_REQUIRED', 'COMPLETED'] as const) {
 test(`proposal ${code} uses one HTTP request including platform target resolution`, async t => {
  mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token', api_timeout_ms: 10000 });
  const calls: Record<string, unknown>[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (config: Record<string, unknown>) => {
   calls.push(config);
   return { status: 200, headers: {}, data: JSON.stringify({ data: { code, preflight, result: code === 'COMPLETED' ? { mutation: { success: true, message: '道侣申请已发送' }, initiatorName: '甲' } : null } }) };
  }}));
  const data = await executeProposalCommand({ bid: 'one', uid: 1, target: '@目标', targetBid: 'two', oathIndex: code === 'COMPLETED' ? 1 : undefined, request: code === 'COMPLETED' ? { requestId: 'trace', idempotencyKey: 'msg' } : undefined });
  assert.equal(data.code, code);
  assert.equal(calls.length, 1);
  assert.match(String(calls[0].url), /companion\/proposals\/command/);
  assert.match(JSON.stringify(calls[0].data), /two/);
  assert.equal(data.result?.initiatorName, code === 'COMPLETED' ? '甲' : undefined);
 });
}
