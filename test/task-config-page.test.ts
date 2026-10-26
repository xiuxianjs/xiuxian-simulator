import { clearBackendTaskSlotWithLimits } from '../src/api/bot/task-slot-clear';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { setBackendTaskSlotAlias, setBackendTaskSlotStep } from '../src/api/bot/task-config-action';
import { runBackendTaskRuntimeAction } from '../src/api/bot/task-runtime-action';

const request = { requestId: 'task-page-message', idempotencyKey: 'task-page-message' };
const page = { config: { slots: Array.from({ length: 10 }, () => ({ alias: '', steps: [] as string[] })) }, limits: { slotCount: 5, maxSteps: 8, isMonthCard: false } };

test('task editor receives config and entitlement in one write response with message idempotency', async t => {
  mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token' });
  const calls: Array<{ headers: Headers; url: string }> = [];
  t.mock.method(axios, 'create', () => ({ request: async (config: { headers: Headers; url: string }) => {
    calls.push(config);
    return { status: 200, headers: {}, data: JSON.stringify({ data: { outcome: 'invalid_step', alias: '', steps: [], page } }) };
  } }));
  const result = await setBackendTaskSlotStep('bid', 1, 1, 0, '', request);
  assert.deepEqual(result.page, page);
  assert.equal(calls.length, 1);
  assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'), request.idempotencyKey);
});

test('runtime overview requests the optional editor snapshot without a second query', async t => {
  mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token' });
  const urls: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (config: { url: string }) => {
    urls.push(config.url);
    return { status: 200, headers: {}, data: JSON.stringify({ data: { outcome: 'not_running', page } }) };
  } }));
  const result = await runBackendTaskRuntimeAction('bid', 1, 'overview', undefined, undefined, request);
  assert.equal(result.page?.limits.slotCount, 5);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /page=true/);
});

test('malformed configuration after an acknowledged write is rejected without retrying the write', async t => {
  mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token' });
  let count = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => {
    count++;
    return { status: 200, headers: {}, data: JSON.stringify({ data: { outcome: 'saved', alias: '', steps: [], page: { ...page, config: { slots: [] } } } }) };
  } }));
  await assert.rejects(setBackendTaskSlotAlias('bid', 1, 1, '每日', request), /任务展示配置响应不完整/);
  assert.equal(count, 1);
});

test('clear performs entitlement precheck and mutation in one request, retaining invalid slot outcome', async t => {
  mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token' });
  let count = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => {
    count++;
    return { status: 200, headers: {}, data: JSON.stringify({ data: { outcome: 'invalid_slot', limits: page.limits } }) };
  } }));
  const result = await clearBackendTaskSlotWithLimits('bid', 1, 6, request);
  assert.equal(result.outcome, 'invalid_slot');
  assert.equal(result.limits.slotCount, 5);
  assert.equal(count, 1);
});
