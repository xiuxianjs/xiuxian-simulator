import { getBackendNewcomerRechargeInfo } from '@src/api/bot/newcomer-recharge-queries';

type DayReward = {
  day: number;
  rewardText: string;
  canClaim: boolean;
  statusTag: string;
};

export type NewcomerInfoResult =
  | { code: 'NOT_IN_PERIOD' }
  | { code: 'FAILED' }
  | {
      code: 'OK';
      currentDay: number;
      contentDays: number;
      todayRechargedYuan: number;
      thresholdYuan: number;
      dayRewards: DayReward[];
    };

export const getNewcomerInfoData = async (uid: number, bid?: string): Promise<NewcomerInfoResult> => {
  const data = await getBackendNewcomerRechargeInfo(bid, uid);

  if (!data.isInPeriod) {
    return { code: 'NOT_IN_PERIOD' };
  }
  const { todayRechargedAmount, currentDay, rewards, thresholdAmount } = data;

  const dayRewards: DayReward[] = rewards.map(reward => ({
    day: reward.day,
    rewardText: reward.rewardText,
    canClaim: reward.canClaim,
    statusTag: reward.statusTag
  }));

  return {
    code: 'OK',
    currentDay,
    contentDays: data.contentDays,
    todayRechargedYuan: todayRechargedAmount / 100,
    thresholdYuan: thresholdAmount / 100,
    dayRewards
  };
};
