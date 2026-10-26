import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { challengeBackendDungeon } from '../src/api/bot/dungeon-challenge';
import { mockBackendConfig } from './backend-config-helper';

test('actual Go dungeon ChallengeByName settlement passes the robot SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestDungeonChallengeActualResponseContract$', '-count=1', '-v'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const match = output.match(/DUNGEON_ACTUAL_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'actual dungeon response fixture output missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Record<string, unknown>>;
  assert.equal(Object.keys(fixtures).length, 7);
  let payload: unknown;
  let calls = 0;
  const requests: Array<{ url: string; body: unknown; key: string | undefined }> = [];
  const server = createServer(async (request, response) => {
    calls++;
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    requests.push({ url: request.url ?? '', body: JSON.parse(Buffer.concat(chunks).toString()), key: request.headers['idempotency-key'] as string | undefined });
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  const context = { requestId: 'contract-request', idempotencyKey: 'contract-message' };
  for (const [scenario, fixture] of Object.entries(fixtures)) {
    payload = fixture;
    const result = await challengeBackendDungeon('one', 1, '桃花镇', context);
    const battle = fixture.battle as Record<string, unknown>;
    assert.deepEqual(result, {
      dungeonId: fixture.dungeonId, won: fixture.won,
      experienceGained: fixture.experienceGained, spiritStoneGained: fixture.spiritStoneGained,
      battle: { winner: battle.Winner, rounds: battle.Rounds },
      drops: fixture.drops, rewardsByUser: fixture.rewardsByUser, logId: fixture.logId
    }, scenario);
    assert.deepEqual(requests.at(-1), { url: '/api/v1/players/1/dungeons/challenge', body: { dungeonName: '桃花镇' }, key: 'contract-message' });
  }
  // Invalid nested rewards and top-level fields must remain visible as contract
  // failures. Do not turn missing authoritative settlement into empty rewards.
  const source = fixtures['win-rewards'];
  for (const key of ['dungeonId', 'experienceGained', 'spiritStoneGained']) {
    for (const invalid of [null, '1', 1.25, -1, Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...source, [key]: invalid };
      await assert.rejects(challengeBackendDungeon('one', 1, '桃花镇', context), /秘境挑战响应不完整/);
    }
  }
  for (const key of ['currency', 'items', 'firstClear']) {
    payload = { ...source, rewardsByUser: [(source.rewardsByUser as Record<string, unknown>[])[0]].map(member => ({ ...member, [key]: null })) };
    await assert.rejects(challengeBackendDungeon('one', 1, '桃花镇', context), /秘境挑战奖励响应不完整/);
  }
  const before = calls;
  for (const uid of [0, -1, 1.25, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(challengeBackendDungeon('one', uid, '桃花镇', context), /秘境挑战请求参数无效/);
  }
  assert.equal(calls, before, 'invalid request parameters must not reach settlement');
});
