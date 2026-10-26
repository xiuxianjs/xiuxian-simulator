import { validateBackendAchievementClaim } from '@src/api/bot/achievement-claim';
import { displayCurrencyText } from '@src/constants/currency';
import { BackendAPIError } from '@src/api/bot/client';
import { logger, type Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { validateGuardedAchievement, type AchievementLockedResult } from '@src/api/bot/achievement-robot-query';

export type ClaimCombatPowerResult =
  | {
      code: 'OK';
      data: {
        claimed: Array<{
          achievementName: string;
          rewardText: string;
        }>;
        claimedCount: number;
      };
    }
  | {
      code: 'NO_CLAIMABLE';
      data: {
        nextTargetName: string;
      };
    }
  | { code: 'INVALID_USER' | 'LOAD_FAILED'; data?: undefined };

export default async function App(params: { event: GameEvent; next: Next }): Promise<ClaimCombatPowerResult | AchievementLockedResult | undefined> {
  try {
    const response = await runRobotBusiness(
      params.event,
      'achievements.claim-combat-power',
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
    const claimed = result.claimed.map(item => ({
      achievementName: item.achievementName,
      rewardText: displayCurrencyText(item.rewardText)
    }));

    if (claimed.length <= 0) {
      return { code: 'NO_CLAIMABLE', data: { nextTargetName: '暂无' } };
    }

    return {
      code: 'OK',
      data: {
        claimed,
        claimedCount: claimed.length
      }
    };
  } catch (error) {
    if (error instanceof BackendAPIError && error.status === 409) {
      return { code: 'NO_CLAIMABLE', data: { nextTargetName: '请使用 /成就 战力 查看下一目标' } };
    }
    logger.error('领取战力成就失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
