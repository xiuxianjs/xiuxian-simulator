import { requestBackend } from './client';
import type { TowerRewardOverviewQueryData } from '../schemas/tower-reward-overview-query';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('通天塔奖励总览数据不完整');
  }

  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('通天塔奖励总览缺少数值');
  }

  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('通天塔奖励总览缺少状态');
  }

  return value;
}
function nullableString(value: unknown): string | null {
  if (value !== null && typeof value !== 'string') {
    throw new Error('通天塔奖励总览文本无效');
  }

  return value;
}
export async function getBackendTowerRewardOverview(bid: string | undefined, uid: number): Promise<TowerRewardOverviewQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const row = object(await requestBackend(bid, 'get_players_id_tower_rank_rewards', { path: { id: uid } }));

  if (
    !Array.isArray(row.firstRewards) ||
    typeof row.monthlyClaimStatus !== 'string' ||
    !['AVAILABLE', 'NOT_RANKED', 'ALL_CLAIMED'].includes(row.monthlyClaimStatus)
  ) {
    throw new Error('通天塔奖励总览状态无效');
  }

  return {
    canUseFifthLayerFeature: boolean(row.canUseFifthLayerFeature),
    realmName: nullableString(row.realmName),
    currentDay: number(row.currentDay),
    userRank: number(row.userRank),
    maxRank: number(row.maxRank),
    monthlyClaimStatus: row.monthlyClaimStatus as TowerRewardOverviewQueryData['monthlyClaimStatus'],
    monthlyClaimable: boolean(row.monthlyClaimable),
    firstRewards: row.firstRewards.map(value => {
      const reward = object(value);

      return {
        ranking: number(reward.ranking),
        canClaim: boolean(reward.canClaim),
        lingJing: number(reward.lingJing),
        spiritStone: number(reward.spiritStone),
        description: nullableString(reward.description)
      };
    })
  };
}
