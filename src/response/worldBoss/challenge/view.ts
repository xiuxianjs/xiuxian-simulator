import type { WorldBossBatch, WorldBossRound } from '@src/api/bot/world-boss-challenge';
import type { WorldBossChallengeData } from '@src/response-apps/worldBoss/challenge/app';

export function worldBossChallengeView(result: WorldBossRound | WorldBossBatch, batchMode: boolean): WorldBossChallengeData {
  const last = batchMode ? (result as WorldBossBatch).lastRound : (result as WorldBossRound);
  const batch = batchMode ? (result as WorldBossBatch) : undefined;

  return {
    stageName: batch?.stageName ?? last.stageName,
    bossTitle: batch?.bossTitle ?? last.bossTitle,
    bossName: batch?.bossName ?? last.bossName,
    damageDealt: last.damageDealt,
    totalPlayerDamage: last.totalPlayerDamage,
    attackCount: last.attackCount,
    remainingAttempts: batch?.remainingAttempts ?? last.remainingAttempts,
    rank: last.rank,
    battle: last.battle,
    battleSummary: last.battleSummary,
    logId: last.logId,
    batchMode: Boolean(batch),
    stopReason: batch?.stopReason,
    rounds: batch?.rounds,
    totalDamageDealt: batch?.totalDamageDealt,
    attemptsUsed: batch?.attemptsUsed
  };
}
