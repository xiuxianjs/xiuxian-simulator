import { getBackendWorldBossRewards } from '@src/api/bot/world-boss-rewards-queries';
import { worldBossRewardsView } from '@src/response/worldBoss/view';
import { logger } from 'alemonjs';

export type RewardTierItem = {
  tierName: string;
  condText: string;
  spiritStone: number;
  spiritCrystal: number;
};

export type WorldBossRewardsData = {
  stageName: string;
  bossTitle: string;
  bossName: string;
  baseDamage: string;
  tiers: RewardTierItem[];
  claimableRewardCount: number;
};

export type WorldBossRewardsResult = { code: 'OK'; data: WorldBossRewardsData } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string }): Promise<WorldBossRewardsResult> {
  try {
    const facts = await getBackendWorldBossRewards(params.bid, params.uid);
    const { available, unavailableMessage, config } = facts;

    if (!available || !config) {
      return { code: 'LOAD_FAILED', data: { message: unavailableMessage } };
    }

    return { code: 'OK', data: worldBossRewardsView(facts) };
  } catch (error) {
    logger.error('查询凶兽奖励失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '查询奖励信息失败' }
    };
  }
}
