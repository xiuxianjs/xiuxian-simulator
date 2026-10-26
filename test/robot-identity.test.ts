import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { normalizeRobotBid } from '../src/api/bot/robot-bid';
import { requestBackend } from '../src/api/bot/client';
import { mockBackendConfig } from './backend-config-helper';

test('robot IDs accept exact strings and lossless numeric platform IDs', () => {
  assert.equal(normalizeRobotBid('001234'), '001234');
  assert.equal(normalizeRobotBid('QQ:abc-123'), 'QQ:abc-123');
  assert.equal(normalizeRobotBid(123456789), '123456789');
  assert.equal(normalizeRobotBid(9007199254740993n), '9007199254740993');
  assert.equal(normalizeRobotBid('a'.repeat(255)), 'a'.repeat(255));
});

test('invalid IDs are rejected without repairing or guessing player identity', () => {
  for (const value of [undefined, null, '', 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 0n, false, {}, ['123'], ' 123', '123 ', 'a,b', '玩家', 'a\nb', 'a'.repeat(256)]) {
    assert.throws(() => normalizeRobotBid(value), { code: 'SDK_ROBOT_BID_INVALID' });
  }
});

test('request wrapper normalizes numeric IDs before headers and rejects invalid IDs before transport', async t => {
  mockBackendConfig(t, { api_url: 'https://synthetic.test', robot_auth_token: 'test-token' });
  let requests = 0;
  t.mock.method(axios, 'create', () => ({ request: async (options: {headers: Record<string, string>}) => {
    requests++;
    assert.equal(new Headers(options.headers).get('X-Bid'), '123456');
    return { status: 200, headers: { 'content-type': 'application/json' }, data: JSON.stringify({data: {}}) };
  } }));
  await requestBackend(123456, 'post_v2_robot_business_operation', { idempotencyKey: 'test-identity', path: { operation: 'settings.overview' }, body: { platform: 'onebot', messageText: '/我的设置', arguments: {} } });
  assert.equal(requests, 1);
  await assert.rejects(requestBackend(undefined, 'post_v2_robot_business_operation', { idempotencyKey: 'test-identity', path: { operation: 'settings.overview' }, body: { platform: 'onebot', messageText: '/我的设置', arguments: {} } }), { code: 'SDK_ROBOT_BID_INVALID' });
  assert.equal(requests, 1);
});
