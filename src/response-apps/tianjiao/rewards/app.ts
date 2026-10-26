import { presentTianjiaoRewards } from '@src/api/bot/tianjiao-robot-query';
import { getBackendTianjiaoRewards } from '@src/api/bot/tianjiao-rewards-queries';

export type TianjiaoRewardsAppResult =
  | { code: 'NO_MATCH' }
  | { code: 'LOCKED'; message: string }
  | {
      code: 'SUCCESS';
      data: {
        stageLevel: number;
        stageName: string;
        tiers: Array<{ rank: number; rewardText: string; claimedAt: string | null }>;
        records: Array<{ stageLevel: number; stageName: string; rank: number; rewardText: string; claimedAt: string }>;
        recordTotal: number;
      };
    };

export default async function App(params: { messageText: string; uid: number; bid?: string }): Promise<TianjiaoRewardsAppResult> {
  if (!/^(!|！|\/|#|＃)?(登天奖励|天骄奖励)(记录)?$/.test(params.messageText || '')) {
    return { code: 'NO_MATCH' };
  }
  const data = await getBackendTianjiaoRewards(params.bid, params.uid);

  return presentTianjiaoRewards(data);
}
