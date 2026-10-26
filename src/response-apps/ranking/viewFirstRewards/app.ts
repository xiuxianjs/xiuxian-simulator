import { presentTowerFirstRewards } from '@src/api/bot/ranking-robot-query';
import { getBackendTowerFirstRewards } from '@src/api/bot/tower-rewards-queries';

export type ViewFirstRewardsResult =
  | { code: 'INVALID_USER' }
  | { code: 'LOCKED'; realmName: string }
  | { code: 'TOWER_CLOSED'; message: string }
  | {
      code: 'OK';
      data: {
        userRank: number;
        maxRank: number;
        rewards: Array<{
          ranking: number;
          state: 'CLAIMED' | 'CLAIMABLE' | 'REACHABLE' | 'LOCKED';
          description?: string;
        }>;
        hasClaimableReward: boolean;
      };
    };

export default async function App(params: { bid?: string; uid: number }): Promise<ViewFirstRewardsResult> {
  const data = await getBackendTowerFirstRewards(params.bid, params.uid);

  return presentTowerFirstRewards(data);
}
