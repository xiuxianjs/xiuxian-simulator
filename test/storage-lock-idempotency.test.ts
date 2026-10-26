import { mockBackendConfig } from './backend-config-helper';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { createClient } from '../src/api/core';
import { setBackendStorageLock } from '../src/api/bot/storage-lock';
import type { StorageLockSelector } from '../src/api/schemas/storage-lock';

test('lock and unlock send message identity for instance, category and name selectors', async t => {
  mockBackendConfig(t, { api_url: 'https://backend.test', robot_auth_token: 'test-token', api_timeout_ms: 10000 });
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (options: { headers: Record<string, string>; data: string; url: string }) => {
    calls++;
    assert.equal(new Headers(options.headers).get('Idempotency-Key'), `message-${calls}`);
    assert.equal(new Headers(options.headers).get('X-Request-ID'), `request-${calls}`);
    assert.equal(options.url, 'https://backend.test/api/v1/players/1/storage/lock-state');
    const body = JSON.parse(options.data);
    assert.equal(body.locked, calls <= 3);
    const data = {
      kind: body.selector.kind,
      [body.selector.kind]: body.selector.kind === 'instance'
        ? { outcome: 'changed', count: 1, name: '精力丹', group: false }
        : body.selector.kind === 'category'
          ? { outcome: 'changed', count: 1 }
          : { completion: 'completed', changedCount: 1, changes: [{ asset: 'item', templateId: 1, count: 1, name: '精力丹' }], issues: [] },
      view: { success: true, count: 1, message: body.locked ? '锁定成功' : '解锁成功' }
    };
    return { status: 200, headers: {}, data: JSON.stringify({ data }) };
  } }));
  const selectors: StorageLockSelector[] = [
    { kind: 'instance', asset: 'item', instanceId: 21087 },
    { kind: 'category', category: 'prop' },
    { kind: 'name', name: '精力丹' }
  ];
  for (const locked of [true, false]) {
    for (const selector of selectors) {
      const next = calls + 1;
      const result = await setBackendStorageLock('bid', 1, { locked, selector }, { requestId: `request-${next}`, idempotencyKey: `message-${next}` });
      assert.equal(result.view.success, true);
    }
  }
  await assert.rejects(setBackendStorageLock('bid', 1, { locked: false, selector: selectors[0] }), /缺少唯一标识/);
  assert.equal(calls, 6);
});

test('SDK respects optional user keys and sends explicitly provided keys even when metadata omits them', async () => {
  const seen: unknown[] = [];
  const client = createClient({ baseUrl: 'https://backend.test', identity: { kind: 'user', token: 'test-token' }, adapter: async config => {
    seen.push(config.headers.get('Idempotency-Key'));
    return { status: 200, statusText: 'OK', headers: {}, config, data: '{"data":{}}' };
  } });
  await client.request('post_players_id_storage_lock_state', { path: { id: 1 }, body: { locked: false, selector: { kind: 'instance', asset: 'item', instanceId: 21087 } } });
  await client.request('post_players_id_equipment_lock', { path: { id: 1 }, body: { instanceId: 1 }, idempotencyKey: 'explicit-message' });
  assert.deepEqual(seen, [undefined, 'explicit-message']);
  // Required operations still reject missing keys before transport.
  // @ts-expect-error Intentionally exercise runtime validation without a required key.
  await assert.rejects(client.request('post_players_id_consume', { path: { id: 1 }, body: { itemName: '精力丹', quantity: 3 } }));
  assert.equal(seen.length, 2);
});
