import { exactInteger } from '../core/exact-json';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type WorldBossClaimAllItem = {
  bossDate: string;
  stageLevel: number;
  stageName: string;
  tierName: string;
  spiritStone: number | bigint;
  spiritCrystal: number | bigint;
  playerDamage: number | bigint;
};

export type WorldBossClaimAllData = {
  items: WorldBossClaimAllItem[];
  totalStone: number | bigint;
  totalCrystal: number | bigint;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('凶兽奖励响应不完整');
  }

  return value as Record<string, unknown>;
}

function item(value: unknown): WorldBossClaimAllItem {
  const row = record(value);

  if (
    typeof row.bossDate !== 'string' ||
    typeof row.stageName !== 'string' ||
    typeof row.tierName !== 'string' ||
    typeof row.stageLevel !== 'number' ||
    !Number.isSafeInteger(row.stageLevel) ||
    row.stageLevel < 1
  ) {
    throw new Error('凶兽奖励条目不完整');
  }

  return {
    bossDate: row.bossDate,
    stageLevel: row.stageLevel,
    stageName: row.stageName,
    tierName: row.tierName,
    spiritStone: exactInteger(row.spiritStone),
    spiritCrystal: exactInteger(row.spiritCrystal),
    playerDamage: exactInteger(row.playerDamage)
  };
}

export async function claimAllBackendWorldBossRewards(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<WorldBossClaimAllData> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('凶兽领奖参数无效');
  }

  return parseWorldBossClaimAll(
    await requestBackend(bid, 'post_players_id_world_boss_rewards_claim_all', {
      path: { id: uid },
      ...writeContext(request)
    })
  );
}

export function parseWorldBossClaimAll(value: unknown): WorldBossClaimAllData {
  const data = record(value);

  if (!Array.isArray(data.items)) {
    throw new Error('凶兽奖励条目不完整');
  }

  const result = {
    items: data.items.map(item),
    totalStone: exactInteger(data.totalStone),
    totalCrystal: exactInteger(data.totalCrystal)
  };
  const totals = result.items.reduce(
    (sum, current) => ({
      stone: sum.stone + BigInt(current.spiritStone),
      crystal: sum.crystal + BigInt(current.spiritCrystal)
    }),
    { stone: 0n, crystal: 0n }
  );

  if (totals.stone !== BigInt(result.totalStone) || totals.crystal !== BigInt(result.totalCrystal)) {
    throw new Error('凶兽奖励合计不一致');
  }

  return result;
}
