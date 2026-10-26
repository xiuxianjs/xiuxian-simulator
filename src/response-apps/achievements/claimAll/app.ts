import { validateBackendAchievementClaim } from '@src/api/bot/achievement-claim';
import { displayCurrencyText } from '@src/constants/currency';
import { BackendAPIError } from '@src/api/bot/client';
import type { CodeResult } from '@src/types/result';
import { logger, type Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { validateGuardedAchievement, type AchievementLockedResult } from '@src/api/bot/achievement-robot-query';

export type ClaimAllAchievementsResult = CodeResult<
  'OK',
  'INVALID_USER' | 'NO_CLAIMABLE' | 'LOAD_FAILED',
  {
    claimed: Array<{ category: string; categoryLabel: string; achievementName: string; rewardText: string }>;
    claimedCount: number;
  }
>;

export default async function App(params: { event: GameEvent; next: Next }): Promise<ClaimAllAchievementsResult | AchievementLockedResult | undefined> {
  try {
    const response = await runRobotBusiness(
      params.event,
      'achievements.claim-all',
      {},
      value => validateGuardedAchievement(value, validateBackendAchievementClaim),
      params.next
    );

    if (response.handled) {
      return;
    }
    if (response.data.locked) {
      return { code: 'LOCKED', data: { realmName: response.data.realmName } };
    }
    const result = response.data.data;

    if (result.claimed.length <= 0) {
      return { code: 'NO_CLAIMABLE' };
    }

    return {
      code: 'OK',
      data: {
        claimed: result.claimed.map(item => ({ ...item, rewardText: displayCurrencyText(item.rewardText) })),
        claimedCount: result.claimed.length
      }
    };
  } catch (error) {
    if (error instanceof BackendAPIError && error.status === 409) {
      return { code: 'NO_CLAIMABLE' };
    }
    logger.error('一键领取成就失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
