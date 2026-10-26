import { presentTowerMonthlyRewards } from '@src/api/bot/ranking-robot-query';
import { getBackendTowerMonthlyRewards } from '@src/api/bot/tower-rewards-queries';

export type ViewMonthlyRewardsResult =
  | { code: 'INVALID_USER' }
  | { code: 'LOCKED'; realmName: string }
  | { code: 'TOWER_CLOSED'; message: string }
  | {
      code: 'OK';
      data: {
        currentRank: number;
        bestRank: number | null;
        maxRank: number;
        statusLines: string[];
        rewards: Array<{
          id: number;
          rangeText: string;
          rewardTexts: string[];
          state: 'CLAIMED' | 'CLAIMABLE' | 'LOCKED';
        }>;
        hasClaimableReward: boolean;
      };
    };

export default async function App(params: { bid?: string; uid: number }): Promise<ViewMonthlyRewardsResult> {
  const data = await getBackendTowerMonthlyRewards(params.bid, params.uid);

  return presentTowerMonthlyRewards(data);
}
