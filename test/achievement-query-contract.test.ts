import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateBackendAchievementOverview } from '../src/api/bot/achievement-overview-query';
import { validateBackendCombatPowerAchievements } from '../src/api/bot/combat-power-achievement-query';
import { validateBackendAchievementClaim } from '../src/api/bot/achievement-claim';
import { validateBackendAchievements } from '../src/api/bot/queries';

test('shared achievement decoders retain the existing Go response contracts', () => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestRobotResponseContractSerialization$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const match = output.match(/ROBOT_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match);
  const fixtures = JSON.parse(match[1]);
  let overviewCount = 0;
  let combatCount = 0;
  for (const [key, value] of Object.entries(fixtures)) {
    if (key.startsWith('achievementOverviewActual:')) {
      assert.deepEqual(validateBackendAchievementOverview(value), value);
      overviewCount++;
    }
    if (key.startsWith('combatAchievementActual:')) {
      assert.deepEqual(validateBackendCombatPowerAchievements(value), value);
      combatCount++;
    }
  }
  assert.ok(overviewCount > 0);
  assert.equal(combatCount, 5);
  for (const [key, completed] of [['catalogAchievements', false], ['completedAchievements', true], ['emptyAchievements', true]] as const) {
    const source = fixtures[key];
    const parsed = validateBackendAchievements(source, completed);
    assert.equal(parsed.achievements.length, source.items.length);
    assert.equal(parsed.total, source.page.total);
    assert.equal(parsed.currentPage, source.page.currentPage);
    for (const [index, item] of parsed.achievements.entries()) {
      const original = source.items[index];
      assert.equal(item.displayIndex, completed ? null : original.displayIndex);
      assert.equal(item.completedAt, original.completedAt ? new Date(original.completedAt).toISOString() : null);
    }
  }
  for (const key of ['achievementClaimed', 'achievementEmptyReward']) {
    const source = fixtures[key];
    const parsed = validateBackendAchievementClaim(source);
    assert.equal(parsed.claimedCount, source.claimedCount);
    assert.deepEqual(parsed.claimed.map(row => row.rewardText), source.claimed.map((row: { issued: Array<{ name: string; amount: number }> }) =>
      row.issued.map(reward => `${reward.name}×${reward.amount}`).join('、')));
  }
  const completed = fixtures.completedAchievements;
  assert.throws(() => validateBackendAchievements({ ...completed, items: [{ ...completed.items[0], completedAt: undefined }] }, true));
  assert.throws(() => validateBackendAchievementClaim({ ...fixtures.achievementClaimed, claimedCount: 999 }));
});
