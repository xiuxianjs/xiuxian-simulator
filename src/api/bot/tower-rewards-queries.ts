import { requestBackend } from './client';
import type { TowerFirstRewardsQueryData, TowerMonthlyRewardsQueryData, TowerRewardQueryAccess } from '../schemas/tower-rewards-query';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('排名奖励接口不完整');
  }

  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('排名奖励缺少数值');
  }

  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('排名奖励缺少状态');
  }

  return value;
}
function access(row: Record<string, unknown>): TowerRewardQueryAccess {
  if (row.realmName !== null && typeof row.realmName !== 'string') {
    throw new Error('排名奖励缺少境界');
  }

  return {
    canUseFifthLayerFeature: boolean(row.canUseFifthLayerFeature),
    realmName: row.realmName,
    isOpen: boolean(row.isOpen),
    openStartDay: number(row.openStartDay),
    openEndDay: number(row.openEndDay)
  };
}
export async function getBackendTowerFirstRewards(bid: string | undefined, uid: number): Promise<TowerFirstRewardsQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseTowerFirstRewards(await requestBackend(bid, 'get_players_id_tower_rank_rewards_first', { path: { id: uid } }));
}

export function parseTowerFirstRewards(value: unknown): TowerFirstRewardsQueryData {
  const row = object(value);

  if (!Array.isArray(row.rewards)) {
    throw new Error('排名奖励缺少配置');
  }

  return {
    ...access(row),
    userRank: number(row.userRank),
    maxRank: number(row.maxRank),
    hasClaimableReward: boolean(row.hasClaimableReward),
    rewards: row.rewards.map(value => {
      const r = object(value);

      if (
        (r.state !== 'CLAIMED' && r.state !== 'CLAIMABLE' && r.state !== 'REACHABLE' && r.state !== 'LOCKED') ||
        (r.description !== undefined && typeof r.description !== 'string')
      ) {
        throw new Error('首通奖励状态无效');
      }

      return { ranking: number(r.ranking), state: r.state, description: r.description };
    })
  };
}
export async function getBackendTowerMonthlyRewards(bid: string | undefined, uid: number): Promise<TowerMonthlyRewardsQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseTowerMonthlyRewards(await requestBackend(bid, 'get_players_id_tower_rank_rewards_monthly', { path: { id: uid } }));
}

export function parseTowerMonthlyRewards(value: unknown): TowerMonthlyRewardsQueryData {
  const row = object(value);

  if (!Array.isArray(row.rewards) || (row.claimStatus !== 'AVAILABLE' && row.claimStatus !== 'NOT_RANKED' && row.claimStatus !== 'ALL_CLAIMED')) {
    throw new Error('月度奖励状态无效');
  }

  return {
    ...access(row),
    currentRank: number(row.currentRank),
    bestRank: row.bestRank === null ? null : number(row.bestRank),
    maxRank: number(row.maxRank),
    claimCount: number(row.claimCount),
    bestClaimRank: row.bestClaimRank === null ? null : number(row.bestClaimRank),
    claimStatus: row.claimStatus,
    hasClaimableReward: boolean(row.hasClaimableReward),
    rewards: row.rewards.map(value => {
      const r = object(value);

      if (r.state !== 'CLAIMED' && r.state !== 'CLAIMABLE' && r.state !== 'LOCKED') {
        throw new Error('月度奖励档位状态无效');
      }

      return {
        id: number(r.id),
        rankingStart: number(r.rankingStart),
        rankingEnd: number(r.rankingEnd),
        lingJing: number(r.lingJing),
        spiritStone: number(r.spiritStone),
        state: r.state
      };
    })
  };
}
