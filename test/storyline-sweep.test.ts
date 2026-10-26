import { mockBackendConfig } from './backend-config-helper';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { sweepBackendStoryline } from '../src/api/bot/storyline-sweep';

test('sweep SDK accepts signed experience adjustment without repeating writes', async t => {
  const base = { stageLabel: '1-1', times: 1, totalSpiritCost: 3, totalExp: 10, totalSpiritStone: 7, totalBonusExp: 0, expBonusText: '', allItemsGained: [] };
  let payload: Record<string, unknown> = base;
  let writes = 0;
  const server = createServer((request, response) => {
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '/api/v1/players/1/storyline/sweep');
    assert.equal(request.headers['idempotency-key'], 'sweep-test-message');
    writes++;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'local-test-token' });
  const sweep = () => sweepBackendStoryline('test-player', 1, 1, 1, 1, { requestId: 'sweep-test-message', idempotencyKey: 'sweep-test-message' });
  try {
    for (const adjustment of [0, 1, -5, -10]) {
      payload = { ...base, totalBonusExp: adjustment };
      const before = writes;
      const result = await sweep();
      assert.equal(result.totalBonusExp, adjustment);
      assert.equal(result.totalExp + result.totalBonusExp, 10 + adjustment);
      assert.deepEqual(result.allItemsGained, []);
      assert.equal(writes, before + 1);
    }
    for (const invalid of [{ totalBonusExp: -11 }, { totalBonusExp: '-5' }, { totalBonusExp: undefined }, { totalExp: -1 }, { totalBonusExp: 0.5 }, { allItemsGained: null }]) {
      payload = { ...base, ...invalid };
      await assert.rejects(sweep(), /主线扫荡响应不完整/);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
