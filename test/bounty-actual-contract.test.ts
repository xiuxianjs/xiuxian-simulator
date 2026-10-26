import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { getBackendBounties } from '../src/api/bot/bounty-queries';
import { acceptBackendBounty, claimBackendBounty, getBackendBountyPublishPolicy, getBackendPendingBountyRewards, publishBackendBounty } from '../src/api/bot/bounty-actions';
import { mockBackendConfig } from './backend-config-helper';

test('actual bounty publish, battle and deferred claim receipts pass the robot SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestBountyActualResponseContract$', '-count=1', '-v'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const match = output.match(/BOUNTY_ACTUAL_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'actual bounty fixtures missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Record<string, unknown>>;
  assert.equal(Object.keys(fixtures).length, 18);
  let payload: unknown;
  let calls = 0;
  const requests: Array<{ method: string; url: string; key: string | undefined; body: unknown }> = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks).toString();
    requests.push({ method: request.method ?? '', url: request.url ?? '', key: request.headers['idempotency-key'] as string | undefined, body: body ? JSON.parse(body) : undefined });
    calls++;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  const context = { requestId: 'bounty-request', idempotencyKey: 'bounty-message' };
  for (const [key, fixture] of Object.entries(fixtures)) {
    payload = fixture;
    if (key.startsWith('list-')) {
      const result = await getBackendBounties('hunter', 1);
      assert.deepEqual(result, {
        total: fixture.total,
        list: (fixture.items as Record<string, unknown>[]).map(item => ({ ...item, publisherName: item.publisherName === null ? '未知' : item.publisherName, targetName: item.targetName === null ? '未知' : item.targetName, expiresAt: new Date(item.expiresAt as string) }))
      }, key);
    } else if (key.startsWith('pending')) {
      assert.deepEqual(await getBackendPendingBountyRewards('hunter', 1), fixture, key);
    } else if (key.startsWith('claim:')) {
      assert.deepEqual(await claimBackendBounty('hunter', 1, context), { rewardAmount: fixture.changeAmount }, key);
    } else if (key.startsWith('accept:')) {
      const result = await acceptBackendBounty('hunter', 1, context);
      const battle = fixture.battle as Record<string, unknown>;
      const units = (side: unknown) => (side as Record<string, unknown>[]).map(unit => ({ name: unit.Name, hp: unit.HP, maxHp: unit.MaxHP, isDead: unit.Dead || (unit.HP as number) <= 0 }));
      assert.deepEqual(result, {
        battleWon: fixture.battleWon, completionId: fixture.completionId, logId: fixture.logId,
        bountyReward: fixture.bountyReward, stoneReward: fixture.stoneReward, crystalReward: fixture.crystalReward, droppedItem: fixture.droppedItem,
        expReward: fixture.expReward, streak: fixture.streak, streakBonus: fixture.streakBonus, shaQiBonus: fixture.shaQiBonus,
        bonusText: fixture.bonusText, losingStreakText: fixture.losingStreakText, targetName: fixture.targetName,
        qiCost: fixture.qiCost, remainingCount: fixture.remainingCount, dailyAcceptLimit: fixture.dailyAcceptLimit,
        battleResult: { totalRounds: battle.Rounds, finalState: { sideA: units(battle.SideA), sideB: units(battle.SideB) } }
      }, key);
      assert.equal(requests.at(-1)?.key, 'bounty-message');
      assert.equal(requests.at(-1)?.url, '/api/v1/bounties/1/accept');
    } else if (key === 'policy') {
      assert.deepEqual(await getBackendBountyPublishPolicy('publisher'), fixture);
    } else if (key === 'publish') {
      assert.deepEqual(await publishBackendBounty('publisher', 1, 2, 1000, 3, context), {
        bountyId: fixture.id, totalCost: fixture.totalCost, fee: fixture.fee, rewardPool: fixture.rewardPool,
        rewardPerPerson: fixture.rewardPerCompletion, maxCompletions: fixture.maxCompletions, targetName: fixture.targetName, validHours: fixture.validHours
      });
      assert.deepEqual(requests.at(-1)?.body, { targetId: 2, amount: 1000, maxCompletions: 3 });
      assert.equal(requests.at(-1)?.key, 'bounty-message');
    }
  }
  const accepted = fixtures['accept:win'];
  for (const field of ['qiCost', 'remainingCount', 'dailyAcceptLimit', 'expReward', 'streak']) {
    for (const invalid of [null, '1', 1.25, Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...accepted, [field]: invalid };
      await assert.rejects(acceptBackendBounty('hunter', 1, context), /接赏响应不完整/);
    }
  }
  for (const reward of [null, 0, -1, 1.25, Number.MAX_SAFE_INTEGER + 1]) {
    payload = { ...fixtures['claim:win'], changeAmount: reward };
    await assert.rejects(claimBackendBounty('hunter', 1, context), /领赏响应不完整/);
  }
  const before = calls;
  for (const id of [0, -1, 1.25, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(acceptBackendBounty('hunter', id, context), /接赏参数无效/);
    await assert.rejects(claimBackendBounty('hunter', id, context), /领赏参数无效/);
  }
  assert.equal(calls, before, 'invalid IDs must not reach a write');
});
