import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { backendRequestTimeout, isBattleOperation } from '../src/api/bot/battle-request';
import { requestBackend } from '../src/api/bot/client';
import { SDKError } from '../src/api/core/error';
import { mockBackendConfig } from './backend-config-helper';

const writes = ['fishing.start-current', 'fishing.stop-current', 'fishing.configure', 'fishing.purchase', 'fishing.preview', 'fishing.confirm', 'fishing.pack-checkout'];

test('fishing writes have a settlement budget without changing queries, battles or longer configuration', () => {
  for (const route of ['post_robot_business_operation', 'post_v2_robot_business_operation'] as const) {
    for (const operation of writes) {
      const parameters = { path: { operation } };
      assert.equal(backendRequestTimeout(route, 10_000, parameters), 60_000);
      assert.equal(backendRequestTimeout(route, 90_000, parameters), 90_000);
      assert.equal(isBattleOperation(route), false);
    }
    for (const operation of ['fishing.query', 'fishing.unknown', 'world-boss.info', '__proto__']) {
      assert.equal(backendRequestTimeout(route, 10_000, { path: { operation } }), 10_000);
    }
    for (const parameters of [undefined, null, {}, { path: null }, { path: { operation: 1 } }]) {
      assert.equal(backendRequestTimeout(route, 10_000, parameters), 10_000);
    }
  }
});

for (const channelMode of [false, true]) {
  for (const operation of ['fishing.start-current', 'fishing.configure'] as const) {
    test(`${channelMode ? 'channel' : 'official'} ${operation} accepts a response after 10 seconds using the original key once`, async t => {
      mockBackendConfig(t, {
        api_url: 'https://backend.test', robot_auth_token: 'fixture-token',
        channel_mode: channelMode, api_timeout_ms: 10_000
      });
      t.mock.timers.enable({ apis: ['setTimeout'] });
      let signal: AbortSignal | undefined;
      let calls = 0;
      let finish!: (value: unknown) => void;
      t.mock.method(axios, 'create', () => ({ request(options: { signal: AbortSignal; headers: Record<string, string> }) {
        calls++;
        signal = options.signal;
        assert.equal(new Headers(options.headers).get('Idempotency-Key'), 'original-fishing-message');
        return new Promise(resolve => { finish = resolve; });
      } }));
      const pending = requestBackend('native-player', 'post_v2_robot_business_operation', {
        path: { operation }, body: { messageText: '/垂钓', platform: 'qq-bot', arguments: {} },
        idempotencyKey: 'original-fishing-message'
      });
      t.mock.timers.tick(12_000);
      assert.equal(signal?.aborted, false);
      const receipt = { operationId: 'original-operation', status: 'completed' };
      finish({ status: 200, headers: {}, data: JSON.stringify({ data: receipt }) });
      assert.deepEqual(await pending, receipt);
      assert.equal(calls, 1);
    });
  }
}

test('fishing timeout remains uncertain and never automatically resubmits a write', async t => {
  mockBackendConfig(t, { api_url: 'https://backend.test', robot_auth_token: 'fixture-token', channel_mode: true, api_timeout_ms: 10_000 });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  let signal: AbortSignal | undefined;
  t.mock.method(axios, 'create', () => ({ request(options: { signal: AbortSignal }) {
    calls++;
    signal = options.signal;
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  } }));
  const pending = requestBackend('native-player', 'post_v2_robot_business_operation', {
    path: { operation: 'fishing.configure' }, body: { messageText: '/垂钓 设置 主饵 唤王饵', platform: 'qq-bot', arguments: { kind: 'settings', settings: { primaryBaitType: 'king' } } },
    idempotencyKey: 'original-settings-message'
  });
  t.mock.timers.tick(59_999);
  assert.equal(signal?.aborted, false);
  t.mock.timers.tick(1);
  await assert.rejects(pending, error => error instanceof SDKError && error.code === 'SDK_TIMEOUT');
  assert.equal(calls, 1);
});
