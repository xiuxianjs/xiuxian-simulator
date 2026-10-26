import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { logger, withEventContext } from 'alemonjs';
import { mockBackendConfig } from './backend-config-helper';
import { requestBackend } from '../src/api/bot/client';
import { createBackendRequestContext } from '../src/api/bot/context';
import type { GameEvent } from '../src/types/event';

test('implicit event traces reach the SDK and logs without inventing write receipts', async t => {
  mockBackendConfig(t, { api_url: 'https://trace.test', robot_auth_token: 'test-only-token', log_api_timings: true });
  const headers: Headers[] = [];
  const logs: unknown[][] = [];
  t.mock.method(logger, 'info', (...args: unknown[]) => { logs.push(args); });
  t.mock.method(axios, 'create', () => ({ request: async (options: { headers: Record<string, string> }) => {
    headers.push(new Headers(options.headers));
    return { status: 200, headers: {}, data: '{"data":{}}' };
  } }));
  const event = { name: 'message.create', UserId: 'player', MessageId: 'message', Platform: 'qq-bot' } as GameEvent;
  await withEventContext(event, () => {}, async () => {
    await requestBackend('player', 'getRobotIdentity');
    await requestBackend('player', 'getRobotIdentity', { requestId: 'explicit-trace' });
    await assert.rejects(requestBackend('player', 'getRobotIdentity', null as never), /Request options must be an object/);
  });
  const implicit = createBackendRequestContext(event).requestId;
  assert.equal(headers[0].get('X-Request-ID'), implicit);
  assert.equal(headers[1].get('X-Request-ID'), 'explicit-trace');
  assert.equal(headers.length, 2);
  assert.ok(headers.every(value => !value.has('Idempotency-Key')));
  assert.equal((logs[0][1] as { requestId: string }).requestId, implicit);
  assert.equal((logs[1][1] as { requestId: string }).requestId, 'explicit-trace');
  assert.deepEqual(logs.map(value => (value[1] as { requestSequence: number }).requestSequence), [1, 2, 3]);
  assert.ok(logs.every(value => (value[1] as { concurrentRequestsAtStart: number }).concurrentRequestsAtStart === 1));
});

test('failed diagnostics preserve the backend result and business error', async t => {
  mockBackendConfig(t, { api_url: 'https://trace.test', robot_auth_token: 'test-only-token', log_api_timings: true });
  t.mock.method(logger, 'info', () => { throw new Error('logging unavailable'); });
  let denied = false;
  t.mock.method(axios, 'create', () => ({ request: async () => denied
    ? { status: 409, headers: {}, data: '{"error":{"code":"CONFLICT","message":"物品数量不足"}}' }
    : { status: 200, headers: {}, data: '{"data":{"found":true}}' }
  }));
  assert.deepEqual(await requestBackend('player', 'getRobotIdentity'), { found: true });
  denied = true;
  await assert.rejects(requestBackend('player', 'getRobotIdentity'), /物品数量不足/);
});
