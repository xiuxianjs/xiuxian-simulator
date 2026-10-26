import { getBackendTowerRewardOverview } from '@src/api/bot/tower-reward-overview-queries';

export type RankingRewardsResult =
  | { code: 'LOCKED'; realmName: string }
  | {
      code: 'OK';
      data: {
        userRank: number;
        maxRank: number;
        firstRewards: Array<{
          ranking: number;
          status: string;
          lingJing: number;
          spiritStone: number;
          description?: string;
        }>;
        monthlyTextLines: string[];
        claimableRankings: number[];
        monthlyClaimable: boolean;
      };
    };

export default async function App(params: { bid?: string; uid: number }): Promise<RankingRewardsResult> {
  const data = await getBackendTowerRewardOverview(params.bid, params.uid);

  if (!data.canUseFifthLayerFeature) {
    return { code: 'LOCKED', realmName: data.realmName ?? '未知' };
  }
  const monthlyMessage = data.monthlyClaimStatus === 'NOT_RANKED' ? '本月未上榜，无月度奖励' : '所有月度奖励已领取';

  return {
    code: 'OK',
    data: {
      userRank: data.userRank,
      maxRank: data.maxRank,
      firstRewards: data.firstRewards.map(reward => ({
        ...reward,
        description: reward.description ?? undefined,
        status: reward.canClaim ? '✅可领取' : '⏸️未达成'
      })),
      monthlyTextLines:
        data.currentDay === 1
          ? ['月度奖励领取中（仅限每月1日）', data.monthlyClaimable ? '✅ 可领取本月奖励' : `⏸️ ${monthlyMessage}`]
          : ['月度奖励将在每月1日发放', '根据上月最终排名领取奖励'],
      claimableRankings: data.firstRewards.filter(reward => reward.canClaim).map(reward => reward.ranking),
      monthlyClaimable: data.monthlyClaimable
    }
  };
}
