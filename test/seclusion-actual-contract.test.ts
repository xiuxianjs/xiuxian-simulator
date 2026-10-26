import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { getBackendSeclusionDisplay, parseStatus } from '../src/api/bot/seclusion-status';
import { endBackendSeclusion } from '../src/api/bot/seclusion-end';
import { mockBackendConfig } from './backend-config-helper';

test('actual seclusion status and end settlement pass the robot SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestSeclusionActualResponseContract$', '-count=1', '-v'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const match = output.match(/SECLUSION_ACTUAL_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'actual seclusion fixtures missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Record<string, unknown>>;
  assert.equal(Object.keys(fixtures).length, 10);
  let payload: unknown;
  let repair: unknown;
  let calls = 0;
  const requests: Array<{ method: string; url: string; key: string | undefined }> = [];
  const server = createServer((request, response) => {
    calls++;
    requests.push({ method: request.method ?? '', url: request.url ?? '', key: request.headers['idempotency-key'] as string | undefined });
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: request.url?.endsWith('/active-marker/repair') ? repair : payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  const context = { requestId: 'seclusion-request', idempotencyKey: 'seclusion-message' };
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (key.startsWith('end:')) {
      payload = fixture;
      assert.deepEqual(await endBackendSeclusion('first', 1, context), fixture, key);
      assert.deepEqual(requests.at(-1), { method: 'POST', url: '/api/v1/players/1/seclusion/end', key: 'seclusion-message' });
      continue;
    }
    const status = fixture.status as Record<string, unknown>;
    payload = status;
    repair = fixture.repair;
    const expected: Record<string, unknown> = {
      inSeclusion: status.inSeclusion, startAvailable: status.startAvailable, startReason: status.startReason,
      canEnd: status.canEnd, endReason: status.endReason, earlyExitPolicy: status.earlyExitPolicy,
      availableDungeons: (status.availableDungeons as Record<string, unknown>[]).map(dungeon => ({ id: dungeon.id, name: dungeon.name,
        startOptions: (dungeon.startOptions as Record<string, unknown>[]).map(option => ({ duration: option.duration, spiritCost: option.spiritCost, available: option.available, reason: option.reason, preview: option.preview })) }))
    };
    if (status.inSeclusion) {
      const record = status.record as Record<string, unknown>;
      expected.record = { id: record.id, duration: record.duration, dungeonId: record.dungeonId,
        elapsedHours: status.elapsedHours, remainingHours: status.remainingHours, settleableBlocks: status.settleableBlocks, settleableHours: status.settleableHours,
        isCompleted: status.isCompleted, dungeonName: status.dungeonName };
    }
    const before = calls;
    assert.deepEqual(await getBackendSeclusionDisplay('first', fixture.uid as number), expected, key);
    assert.equal(calls, before + 2, 'status must repair the marker then read state');
    assert.equal(requests.at(-2)?.method, 'POST');
    assert.equal(requests.at(-1)?.url, `/api/v1/players/${fixture.uid}/seclusion`);
  }
  const source = fixtures['status:active'].status as Record<string, unknown>;
  const dungeon = (source.availableDungeons as Record<string, unknown>[])[0];
  const option = (dungeon.startOptions as Record<string, unknown>[])[0];
  const preview = option.preview as Record<string, unknown>;
  const invalidNumbers = [null, '1', 1.25, Number.MAX_SAFE_INTEGER + 1];
  const changes: Array<(value: unknown) => unknown> = [];
  for (const field of ['id', 'duration', 'dungeonId']) changes.push(value => ({ ...source, record: { ...(source.record as Record<string, unknown>), [field]: value } }));
  for (const field of ['elapsedHours', 'remainingHours', 'settleableBlocks', 'settleableHours']) changes.push(value => ({ ...source, [field]: value }));
  for (const field of ['settleBlockHours', 'refundBeforeHours', 'penaltyBeforeHours']) changes.push(value => ({ ...source, earlyExitPolicy: { ...(source.earlyExitPolicy as Record<string, unknown>), [field]: value } }));
  changes.push(value => ({ ...source, availableDungeons: [{ ...dungeon, id: value }] }));
  for (const field of ['duration', 'spiritCost']) changes.push(value => ({ ...source, availableDungeons: [{ ...dungeon, startOptions: [{ ...option, [field]: value }] }] }));
  for (const field of ['duration', 'dungeonId', 'experience', 'spiritStone', 'huanHunDan', 'yangShenDan', 'soulDew']) changes.push(value => ({ ...source, availableDungeons: [{ ...dungeon, startOptions: [{ ...option, preview: { ...preview, [field]: value } }] }] }));
  changes.push(value => ({ ...source, availableDungeons: [{ ...dungeon, startOptions: [{ ...option, preview: { ...preview, rareDrops: [{ name: '闭关掉落', quantity: value }] } }] }] }));
  for (const change of changes) {
    for (const invalid of invalidNumbers) assert.throws(() => parseStatus(change(invalid)), /响应不完整/);
  }
  for (const field of ['startReason', 'endReason', 'dungeonName']) {
    for (const invalid of [null, 1, [], {}]) assert.throws(() => parseStatus({ ...source, [field]: invalid }), /响应不完整/);
  }
  for (const invalid of [null, 1, [], {}]) assert.throws(() => parseStatus({ ...source, availableDungeons: [{ ...dungeon, startOptions: [{ ...option, reason: invalid }] }] }), /响应不完整/);
  const ended = fixtures['end:penalty'];
  const rewards = ended.rewards as Record<string, unknown>;
  const end = () => endBackendSeclusion('first', 1, context);
  for (const invalid of invalidNumbers) {
    payload = { ...ended, settledHours: invalid };
    await assert.rejects(end(), /出关结算响应不完整/);
  }
  for (const field of ['experience', 'spiritStone', 'huanHunDan', 'yangShenDan', 'soulDew']) {
    for (const invalid of invalidNumbers) {
      payload = { ...ended, rewards: { ...rewards, [field]: invalid } };
      await assert.rejects(end(), /奖励信息无效/);
    }
  }
  for (const invalid of invalidNumbers) {
    payload = { ...ended, rewards: { ...rewards, rareDrops: [{ name: '闭关掉落', quantity: invalid }] } };
    await assert.rejects(end(), /奖励信息无效/);
  }
  for (const field of ['interrupted', 'spiritRefunded', 'penaltyApplied']) {
    for (const invalid of [undefined, null, 0, 'false']) {
      payload = { ...ended, [field]: invalid };
      await assert.rejects(end(), /出关结算响应不完整/);
    }
  }
  payload = { ...ended, presenceText: null };
  assert.deepEqual(await end(), payload, 'retain existing nullable companion text compatibility');
  const before = calls;
  for (const uid of [0, -1, 1.25, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(getBackendSeclusionDisplay('first', uid), /闭关状态查询参数无效/);
    await assert.rejects(endBackendSeclusion('first', uid, context), /出关请求参数无效/);
  }
  for (const bid of [undefined, '', ' ']) {
    await assert.rejects(getBackendSeclusionDisplay(bid, 1), /查询缺少平台身份/);
    await assert.rejects(endBackendSeclusion(bid, 1, context), /出关请求缺少平台身份/);
  }
  assert.equal(calls, before, 'invalid request must not repair a marker or settle rewards');
});
