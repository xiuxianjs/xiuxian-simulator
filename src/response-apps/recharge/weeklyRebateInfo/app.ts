import { getBackendWeeklyRebate } from '@src/api/bot/weekly-rebate-queries';
import type { CumulativeWeeklyRebateQueryData } from '@src/api/schemas/weekly-rebate-query';

type DayReward = {
  day: number;
  label: string;
  rewardText: string;
  canClaim: boolean;
  statusTag: string;
};

export type WeeklyRebateInfoResult =
  | { code: 'NOT_ELIGIBLE'; daysSinceRegistration: number; minAccountDays: number }
  | { code: 'FAILED' }
  | { code: 'CUMULATIVE'; data: CumulativeWeeklyRebateQueryData }
  | {
      code: 'OK';
      todayLabel: string;
      todayRechargeText: string;
      thresholdYuan: number;
      dayRewards: DayReward[];
    };

export const getWeeklyRebateInfoData = async (uid: number, bid?: string): Promise<WeeklyRebateInfoResult> => {
  const status = await getBackendWeeklyRebate(bid, uid);

  if (!status.eligible) {
    return { code: 'NOT_ELIGIBLE', daysSinceRegistration: status.daysSinceRegistration, minAccountDays: status.minAccountDays };
  }
  if ('weekRechargedAmount' in status) {
    return { code: 'CUMULATIVE', data: status };
  }

  const dayRewards: DayReward[] = status.rewards.map(reward => ({
    day: reward.day,
    label: reward.label,
    rewardText: reward.rewardText,
    canClaim: reward.canClaim,
    statusTag: reward.statusTag
  }));

  return {
    code: 'OK',
    todayLabel: status.todayLabel,
    todayRechargeText: status.todayRechargeText,
    thresholdYuan: status.thresholdYuan,
    dayRewards
  };
};
