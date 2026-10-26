import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { shutdownLogger } from 'alemonjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { parseRobotBountyChallenge } from '../src/api/bot/bounty-actions';

after(async () => { await shutdownLogger(); });
test('continued-bounty decoder consumes actual Go win/loss receipts without synthetic IDs', () => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessBountyContinueWinAndLoss$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024
  });
  const rows = [...output.matchAll(/ROBOT_BOUNTY_CONTINUE=(.+)/g)].map(match => JSON.parse(match[1]) as Record<string, unknown>);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(row => row.won).sort(), [false, true]);
  for (const row of rows) {
    const result = parseRobotBountyChallenge(row);
    assert.equal(result.won, row.won);
    assert.equal(result.experienceGained, row.experienceGained);
    assert.equal(result.rewardAmount, row.rewardAmount);
    assert.equal(result.qiCost, 15);
    assert.equal(result.remainingCount, 98);
    assert.equal(result.dailyAcceptLimit, 99);
    assert.ok(result.logId);
    assert.ok(result.battle.sideA.length > 0);
    assert.ok(result.battle.sideB.length > 0);
    assert.ok(!Object.hasOwn(result, 'completionId'));
  }
});
