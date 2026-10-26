import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { postBackendCheckInHub } from '../src/api/bot/checkin-hub';
import { mockBackendConfig } from './backend-config-helper';

test('actual unified check-in preserves partial success and repeated receipts through SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestCheckInHub(ResponseContractSerialization|PreservesPartialSettlementAndLiveReceipts)$', '-count=1', '-v'], {
    cwd: new URL('../../xiuxian-game-server/', import.meta.url),
    env: { ...process.env, GOMODCACHE: process.env.GOMODCACHE ?? '/tmp/xiuxian-go-mod-cache' },
    maxBuffer: 4 * 1024 * 1024
  }).toString();
  const encoded = output.match(/CHECKIN_HUB_RESPONSE_FIXTURES=(.+)/)?.[1];
  assert.ok(encoded);
  const fixtures = JSON.parse(encoded) as Record<string, { results: Array<{ name: string; status: string; message: string }> }>;
  let payload: unknown;
  let calls = 0;
  const request = { requestId: 'hub-contract-request', idempotencyKey: 'hub-contract-key' };
  const server = createServer((req, res) => {
    calls++;
    assert.equal(req.url, '/api/v1/players/1/check-ins/hub');
    assert.equal(req.method, 'POST');
    assert.equal(req.headers['idempotency-key'], request.idempotencyKey);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  try {
    for (const name of ['partial', 'repeated']) {
      payload = fixtures[name];
      const result = await postBackendCheckInHub('player', 1, request);
      assert.deepEqual(result, fixtures[name].results.map(({ name, status, message }) => ({ name, status, message })));
      assert.deepEqual(result.map(row => row.status), name === 'partial'
        ? ['error', 'error', 'done', 'error', 'skip', 'done']
        : ['error', 'error', 'skip', 'error', 'skip', 'skip']);
    }
    for (const invalid of [undefined, null, [], {}, false, 1, 'text']) {
      payload = invalid;
      await assert.rejects(postBackendCheckInHub('player', 1, request), invalid === undefined ? /Response is missing data/ : /统一签到响应不完整/);
      payload = { results: invalid };
      if (!Array.isArray(invalid)) await assert.rejects(postBackendCheckInHub('player', 1, request), /统一签到响应不完整/);
      payload = { results: [invalid] };
      await assert.rejects(postBackendCheckInHub('player', 1, request), /统一签到回执字段不完整/);
    }
    for (const field of ['name', 'status', 'message']) {
      const invalidValues: unknown[] = [undefined, null, 1, false, {}, []];
      if (field === 'status') invalidValues.push('unknown', 'DONE', '');
      for (const invalid of invalidValues) {
        payload = { results: [{ ...fixtures.partial.results[0], [field]: invalid }] };
        await assert.rejects(postBackendCheckInHub('player', 1, request), /统一签到回执字段不完整/);
      }
    }
    payload = { results: [{ name: '', status: 'done', message: '', data: { unknown: 'ignored' } }] };
    assert.deepEqual(await postBackendCheckInHub('player', 1, request), [{ name: '', status: 'done', message: '' }]);
    payload = { results: [] };
    assert.deepEqual(await postBackendCheckInHub('player', 1, request), []);
    const before = calls;
    for (const uid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(postBackendCheckInHub('player', uid, request), /签到玩家参数无效/);
    }
    for (const bid of [undefined, '', '  ']) await assert.rejects(postBackendCheckInHub(bid, 1, request), /签到缺少平台身份/);
    assert.equal(calls, before, 'invalid identity never submits check-in');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
