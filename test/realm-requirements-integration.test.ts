import { mockBackendConfig } from './backend-config-helper';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import promotion from '../src/response-apps/promotion/perform/app';
import overview from '../src/response-apps/realms/myRealm/app';

test('realm panel renders API materials and promotion failure refreshes changed stock', async t => {
  let reads = 0;
  let writes = 0;
  const paths: string[] = [];
  const realmOverview = () => ({
    realm: { name: '元婴后期', experienceLimit: 83250 }, experience: 166500,
    breakthrough: { message: '当前小境界已达上限，请尝试晋级', canBreak: false, nextRealm: null },
    promotion: { message: '晋级材料不足', canPromote: false, nextRealm: { name: '目标境界' }, materials: [
      { itemName: '材料甲', currentQuantity: writes > 0 ? 1 : 2, requiredQuantity: 5 }
    ] }
  });
  const server = createServer((request, response) => {
    paths.push(`${request.method} ${request.url}`);
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'POST' && request.url === '/api/v1/players/1/realm/promotion-command') {
      writes++;
      assert.equal(request.headers['idempotency-key'], 'test-message');
      // A known business rejection is returned with the authoritative post-attempt
      // requirement snapshot; the robot does not issue a follow-up overview GET.
      response.end(JSON.stringify({ data: {
        mode: 'promotion', result: { success: false, message: '晋级材料不足' }, overview: realmOverview()
      } }));
      return;
    }
    if (request.url === '/api/v1/players/1/realm/overview') {
      reads++;
      response.end(JSON.stringify({ data: realmOverview() }));
      return;
    }
    response.statusCode = 404;
    response.end('{}');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'local-test-token' });
  try {
    const panel = await overview({ bid: 'test-player', uid: 1 });
    assert.equal(panel.code, 'OK');
    if (panel.code === 'OK') {
      assert.ok(panel.data.sections.some(s => s.lines.includes('材料甲：可用 2 / 需要 5（还缺 3）')));
      assert.equal(panel.data.showPromotion, false);
    }
    const businessRequestsBeforePromotion = paths.length;
    const result = await promotion({ bid: 'test-player', uid: 1, request: { requestId: 'test-message', idempotencyKey: 'test-message' } });
    assert.equal(result.code, 'FAILED');
    if (result.code === 'FAILED') {
      assert.equal(result.data.message, '晋级材料不足');
      assert.ok(result.data.requirementLines.includes('材料甲：可用 1 / 需要 5（还缺 4）'));
    }
    assert.equal(writes, 1);
    assert.equal(reads, 1);
    assert.equal(paths.length - businessRequestsBeforePromotion, 1);
    assert.deepEqual(paths.slice(businessRequestsBeforePromotion), ['POST /api/v1/players/1/realm/promotion-command']);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
