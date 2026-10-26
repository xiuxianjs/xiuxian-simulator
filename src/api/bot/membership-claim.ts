import { parseBackendMonthCardOverview } from './reward-claim-overview';

export function parseRobotMonthCardClaim(value: unknown) {
  const overview = parseBackendMonthCardOverview(value);

  if (overview.beforeTotal === 0 || !overview.claim || !overview.status) {
    throw new Error('月卡每日奖励响应不完整');
  }

  return {
    days: overview.claim.days,
    rewards: {
      spiritCrystal: overview.claim.rewards.spiritCrystal,
      huanHunDan: overview.claim.rewards.mentalPill,
      yangShenDan: overview.claim.rewards.qiPill
    },
    status: { prepaidCount: overview.status.prepaidCount ?? 0, claimedCount: overview.status.claimedCount, upcomingCount: overview.status.upcomingCount }
  };
}
