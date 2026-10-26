import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { getBackendWorldMilestoneView } from '../src/api/bot/world-milestone-queries';
import { claimBackendWorldMilestones } from '../src/api/bot/world-milestone-actions';
import { mockBackendConfig } from './backend-config-helper';

test('actual world milestones query, claim and committed inventory pass the robot SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestWorldMilestoneActualResponseContract$', '-count=1', '-v'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const match = output.match(/WORLD_MILESTONE_ACTUAL_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'actual world milestone fixtures missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Record<string, unknown>>;
  assert.equal(Object.keys(fixtures).length, 9);
  let payload: unknown;
  let calls = 0;
  let lastRequest: { url: string; method: string; key: string | undefined; body: unknown; repeat: string | undefined };
  const server = createServer(async (request, response) => {
    calls++;
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks).toString();
    const repeat = request.headers['x-repeat-command'];
    lastRequest = { url: request.url ?? '', method: request.method ?? '', key: request.headers['idempotency-key'] as string | undefined, body: raw ? JSON.parse(raw) : undefined, repeat: typeof repeat === 'string' ? Buffer.from(repeat, 'base64').toString() : undefined };
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  const context = { requestId: 'world-request', idempotencyKey: 'world-message' };
  for (const [key, fixture] of Object.entries(fixtures)) {
    payload = fixture;
    if (key.startsWith('claim:')) {
      assert.deepEqual(await claimBackendWorldMilestones('player', 51, context), { count: (fixture.claimed as unknown[]).length, issued: (fixture.claimed as { issued: unknown[] }[]).flatMap(claim => claim.issued) }, key);
      assert.equal(lastRequest!.url, '/api/v1/players/51/recharge/world-milestones/claim-all');
      assert.equal(lastRequest!.key, 'world-message');
      assert.equal(lastRequest!.repeat, '里程碑奖励');
      continue;
    }
    const expected = fixture.empty ? { code: 'EMPTY' } : {
      code: 'VIEW', worldCountText: fixture.worldCountText, nextMilestoneCount: fixture.nextMilestoneCount, nextMilestoneGapText: fixture.nextMilestoneGapText,
      unclaimedCount: fixture.unclaimedCount, milestones: (fixture.milestones as Record<string, unknown>[]).map(item => ({ milestoneCount: item.milestoneCount, status: item.statusText, rewardText: item.rewardText }))
    };
    assert.deepEqual(await getBackendWorldMilestoneView('player', 51), expected, key);
    assert.equal(lastRequest!.url, '/api/v1/players/51/recharge/world-milestones');
    assert.equal(lastRequest!.method, 'GET');
    assert.deepEqual(await getBackendWorldMilestoneView('player', 51, context), expected, `${key} presentation`);
    assert.equal(lastRequest!.url, '/api/v1/players/51/query-presentations');
    assert.deepEqual(lastRequest!.body, { query: 'world_milestones' });
    assert.equal(lastRequest!.key, 'world-message');
    assert.equal(lastRequest!.repeat, '里程碑奖励');
  }
  const source = fixtures['view:partial-unlocked'];
  const view = () => getBackendWorldMilestoneView('player', 51);
  const claim = () => claimBackendWorldMilestones('player', 51, context);
  for (const field of ['unclaimedCount', 'nextMilestoneCount']) {
    for (const invalid of [undefined, '1', 1.25, Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...source, [field]: invalid };
      await assert.rejects(view(), /世界里程碑数值字段不完整/);
    }
  }
  const item = (source.milestones as Record<string, unknown>[])[0];
  for (const invalid of [null, '1', 1.25, Number.MAX_SAFE_INTEGER + 1]) {
    payload = { ...source, milestones: [{ ...item, milestoneCount: invalid }] };
    await assert.rejects(view(), /世界里程碑数值字段不完整/);
  }
  for (const invalid of [undefined, null, 0, 'false']) {
    payload = { ...source, empty: invalid };
    await assert.rejects(view(), /世界里程碑响应不完整/);
  }
  for (const invalid of [undefined, null, {}, 1]) {
    payload = { ...source, milestones: invalid };
    await assert.rejects(view(), /世界里程碑响应不完整/);
  }
  const claimed = fixtures['claim:first'];
  const receipt = (claimed.claimed as Record<string, unknown>[])[0];
  for (const invalid of [null, 0, -1, 1.25, Number.MAX_SAFE_INTEGER + 1]) {
    payload = { ...claimed, claimed: [{ ...receipt, milestoneOrder: invalid }] };
    await assert.rejects(claim(), /世界里程碑领取响应不完整/);
  }
  for (const invalid of [undefined, null, true, 0, 'false']) {
    payload = { ...claimed, partial: invalid };
    await assert.rejects(claim(), /世界里程碑领取响应不完整/);
  }
  for (const invalid of [undefined, null, [], {}, 1]) {
    payload = { ...claimed, claimed: invalid };
    await assert.rejects(claim(), /世界里程碑领取响应不完整/);
  }
  const before = calls;
  for (const uid of [0, -1, 1.25, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(getBackendWorldMilestoneView('player', uid), /世界里程碑查询参数无效/);
    await assert.rejects(claimBackendWorldMilestones('player', uid, context), /世界里程碑领取参数无效/);
  }
  for (const bid of [undefined, '', ' ']) {
    await assert.rejects(getBackendWorldMilestoneView(bid, 51), /查询缺少平台身份/);
    await assert.rejects(claimBackendWorldMilestones(bid, 51, context), /操作缺少平台身份/);
  }
  assert.equal(calls, before, 'invalid requests must not reach the service');
});
