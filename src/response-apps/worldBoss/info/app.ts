import { getBackendWorldBossInfo } from '@src/api/bot/world-boss-info-queries';
import type { CodeResult } from '@src/types/result';
import { worldBossInfoView } from '@src/response/worldBoss/view';
import { logger } from 'alemonjs';

export type WorldBossInfoData = {
  bossTitle: string;
  bossName: string;
  stageName: string;
  activeTimeDesc: string;
  isActive: boolean;
  bossHp: string;
  dailyAttempts: number;
  maxRounds: number;
  hasInstance: boolean;
  totalDamage: string;
  totalAttacks: number;
  playerDamage: string;
  playerAttacks: number;
  remainingAttempts: number;
  playerRank: number | null;
  claimableRewardCount: number;
  rewardPendingUntilEnd: boolean;
};

export type WorldBossInfoResult = CodeResult<'OK', 'LOAD_FAILED', WorldBossInfoData>;

export default async function App(params: { bid: string | undefined; uid: number }): Promise<WorldBossInfoResult> {
  try {
    const info = await getBackendWorldBossInfo(params.bid, params.uid);

    return { code: 'OK', data: worldBossInfoView(info) };
  } catch (error) {
    logger.error('查询凶兽信息失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
