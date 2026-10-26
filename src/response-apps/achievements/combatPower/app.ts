import { validateGuardedAchievement, type AchievementLockedResult } from '@src/api/bot/achievement-robot-query';
import { validateBackendCombatPowerAchievements } from '@src/api/bot/combat-power-achievement-query';
import { displayCurrencyText } from '@src/constants/currency';
import type { CodeResult } from '@src/types/result';
import { logger, type Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';

export type CombatPowerMilestoneCard = {
  name: string;
  description: string;
  threshold: number;
  rewardText: string;
};

export type CombatPowerData = {
  currentPower: number;
  totalCount: number;
  completedCount: number;
  claimableCount: number;
  currentClaimable:
    | (CombatPowerMilestoneCard & {
        remainingClaimableCount: number;
      })
    | null;
  nextTarget:
    | (CombatPowerMilestoneCard & {
        remainingPower: number;
      })
    | null;
  allCompleted: boolean;
  historicalUnclaimed: boolean;
};

export type CombatPowerResult = CodeResult<'OK', 'INVALID_USER' | 'LOAD_FAILED', CombatPowerData>;

export default async function App(params: { event: GameEvent; next: Next }): Promise<CombatPowerResult | AchievementLockedResult | undefined> {
  try {
    const response = await runRobotBusiness(
      params.event,
      'achievements.combat-power',
      {},
      (value: unknown) => validateGuardedAchievement(value, validateBackendCombatPowerAchievements),
      params.next
    );

    if (response.handled) {
      return;
    }
    if (response.data.locked) {
      return { code: 'LOCKED', data: { realmName: response.data.realmName } };
    }
    const data = response.data.data;

    return {
      code: 'OK',
      data: {
        ...data,
        historicalUnclaimed: data.items.some(item => item.completed && !item.claimed && !item.reachable),
        currentClaimable: data.currentClaimable ? { ...data.currentClaimable, rewardText: displayCurrencyText(data.currentClaimable.rewardText) } : null,
        nextTarget: data.nextTarget ? { ...data.nextTarget, rewardText: displayCurrencyText(data.nextTarget.rewardText) } : null
      }
    };
  } catch (error) {
    logger.error('查询战力成就失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
