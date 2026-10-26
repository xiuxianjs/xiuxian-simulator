import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { redeemBackendGiftCode, redeemBackendExternalGiftCode } from '../src/api/bot/gift-code-redeem';
import { BackendAPIError } from '../src/api/bot/client';
import { mockBackendConfig } from './backend-config-helper';

type Fixture = { uid: number; code: string; requestId: string; data?: Record<string, unknown>; error?: { code: string; message: string; requestId: string } };

test('actual gift code receipts, replay and API failures preserve robot boundaries', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestGiftCodeResponseContractSerialization$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 1024 * 1024
  });
  const match = output.match(/GIFT_CODE_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'Go gift code responses missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Fixture>;
  let payload: unknown;
  let status = 200;
  let calls = 0;
  let body: Record<string, unknown> = {};
  const server = createServer(async (request, response) => {
    calls++;
    let text = '';
    for await (const chunk of request) text += chunk;
    body = JSON.parse(text) as Record<string, unknown>;
    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(payload));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'local-code-contract' });
  const run = (entry: Fixture) => redeemBackendGiftCode('bid', entry.uid, entry.code, { requestId: entry.requestId, idempotencyKey: entry.requestId });
  try {
    for (const [key, entry] of Object.entries(fixtures)) {
      if (key === 'empty') {
        const before = calls;
        await assert.rejects(() => run(entry), /礼包码参数无效/);
        assert.equal(calls, before);
        continue;
      }
      if (entry.error) {
        status = entry.error.code === 'NOT_FOUND' ? 404 : 409;
        payload = { error: entry.error };
        await assert.rejects(() => run(entry), (error: unknown) => error instanceof BackendAPIError && error.code === entry.error?.code && error.message === entry.error?.message && error.status === status);
      } else {
        status = 200;
        payload = { data: entry.data };
        const result = await run(entry);
        assert.equal(result.message, '兑换成功，奖励已发送至邮件');
        assert.deepEqual(result.rewardSummary, key === 'replay' ? [] : ['灵石 ×11']);
        assert.equal(body.code, entry.code.replace(/\s+/g, '').toUpperCase());
      }
    }
    status = 200;
    const replay = fixtures.replay;
    const invalidFields: Record<string, unknown[]> = {
      requestId: [undefined, null, '', 'another-request', 1, []],
      status: [undefined, null, '', 'FAILED', 'PROCESSING', ['SUCCEEDED']],
      emailId: [undefined, null, 0, -1, 0.5, '1', Number.MAX_SAFE_INTEGER + 1, []]
    };
    for (const [field, values] of Object.entries(invalidFields)) {
      for (const invalid of values) {
        payload = { data: { ...replay.data, [field]: invalid } };
        await assert.rejects(() => run(replay), /礼包码兑换响应不完整/);
      }
    }
    // This compatibility branch belongs only to local persisted gift receipts.
    payload = { data: replay.data };
    await assert.rejects(() => redeemBackendExternalGiftCode('bid', 1, 'LIVE', 'test', { requestId: replay.requestId, idempotencyKey: replay.requestId }), /远端礼包码兑换响应不完整/);
    for (const invalid of [null, 1, {}, ['奖励', 1]]) {
      payload = { data: { ...fixtures.first.data, rewardSummary: invalid } };
      await assert.rejects(() => run(fixtures.first), /礼包码兑换奖励响应不完整/);
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
