import { claimAllBackendWorldBossRewards } from '@src/api/bot/world-boss-claim';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type ClaimRewardItem = {
  bossDate: string;
  stageName: string;
  tierName: string;
  spiritStone: number | bigint;
  spiritCrystal: number | bigint;
};

export type WorldBossClaimData = {
  items: ClaimRewardItem[];
  totalStone: number | bigint;
  totalCrystal: number | bigint;
};

export type WorldBossClaimResult = { code: 'OK'; data: WorldBossClaimData } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; request?: BackendRequestContext }): Promise<WorldBossClaimResult> {
  try {
    const results = await claimAllBackendWorldBossRewards(params.bid, params.uid, params.request);

    const items: ClaimRewardItem[] = results.items.map(r => {
      return {
        bossDate: r.bossDate,
        stageName: r.stageName,
        tierName: r.tierName,
        spiritStone: r.spiritStone,
        spiritCrystal: r.spiritCrystal
      };
    });

    return {
      code: 'OK',
      data: { items, totalStone: results.totalStone, totalCrystal: results.totalCrystal }
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.info(`领取凶兽奖励失败: ${error.message}`);
    } else {
      logger.error('领取凶兽奖励失败:', error);
    }

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '领取奖励失败' }
    };
  }
}
