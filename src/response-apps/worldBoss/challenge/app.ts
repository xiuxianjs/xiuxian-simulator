import { worldBossChallengeView } from '@src/response/worldBoss/challenge/view';
import { challengeBackendWorldBoss, type WorldBossRound } from '@src/api/bot/world-boss-challenge';
import type { BackendRequestContext } from '@src/api/bot/context';

export type WorldBossChallengeData = {
  stageName: string;
  bossTitle: string;
  bossName: string;
  damageDealt: number | bigint;
  totalPlayerDamage: number | bigint;
  attackCount: number;
  remainingAttempts: number;
  rank: number | null;
  battle: WorldBossRound['battle'];
  battleSummary: WorldBossRound['battleSummary'];
  logId: string;
  batchMode: boolean;
  stopReason?: string;
  rounds?: WorldBossRound[];
  totalDamageDealt?: number | bigint;
  attemptsUsed?: number;
};

export type WorldBossChallengeResult = { code: 'OK'; data: WorldBossChallengeData } | { code: 'LOAD_FAILED'; data: { message: string } };

/** The robot invokes Go once; Go owns both the single and all-attempts settlements. */
export default async function App(params: {
  bid?: string;
  uid: number;
  useAllAttempts?: boolean;
  request?: BackendRequestContext;
}): Promise<WorldBossChallengeResult> {
  try {
    const useAllAttempts = Boolean(params.useAllAttempts);
    const result = await challengeBackendWorldBoss(params.bid, params.uid, useAllAttempts, params.request);

    return { code: 'OK', data: worldBossChallengeView(result, useAllAttempts) };
  } catch (error) {
    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '挑战凶兽失败' } };
  }
}
