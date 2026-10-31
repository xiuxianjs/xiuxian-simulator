import { repeatPresentationHeaders } from './repeat-presentation';
import { parseNormalExperienceGained, parseTreasureEffects, type TreasureEffectNotice } from './treasure-effects';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type DungeonSweepReward = { category: string; name: string; amount: number };
export type DungeonSweep = {
  treasureEffects?: TreasureEffectNotice[];
  normalExperienceGained?: number;
  normalItems?: DungeonSweepReward[];
  dungeonName: string;
  times: number;
  totalSpiritCost: number;
  totalExp: number;
  currency: DungeonSweepReward[];
  items: DungeonSweepReward[];
};
export type DungeonSweepSkipped = { dungeonName: string; message: string };
export type DungeonFreeSweep = {
  treasureEffects?: TreasureEffectNotice[];
  normalExperienceGained?: number;
  skippedDungeons: DungeonSweepSkipped[];
  sweptDungeons: DungeonSweep[];
  totalTimes: number;
  totalExp: number;
  totalSpiritCost: number;
};

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

function reward(value: unknown): DungeonSweepReward {
  if (!record(value) || typeof value.category !== 'string' || typeof value.name !== 'string' || !integer(value.amount)) {
    throw new Error('秘境扫荡奖励响应不完整');
  }

  return { category: value.category, name: value.name, amount: value.amount };
}
export function parseDungeonSweep(value: unknown): DungeonSweep {
  if (
    !record(value) ||
    typeof value.dungeonName !== 'string' ||
    !integer(value.times) ||
    !integer(value.totalSpiritCost) ||
    !integer(value.totalExp) ||
    !Array.isArray(value.currency) ||
    !Array.isArray(value.items)
  ) {
    throw new Error('秘境扫荡响应不完整');
  }
  if (value.normalItems !== undefined && !Array.isArray(value.normalItems)) {
    throw new Error('普通秘境掉落响应无效');
  }

  return {
    treasureEffects: parseTreasureEffects(value.treasureEffects),
    normalExperienceGained: parseNormalExperienceGained(value.normalExperienceGained),
    normalItems: value.normalItems?.map(reward),
    dungeonName: value.dungeonName,
    times: value.times,
    totalSpiritCost: value.totalSpiritCost,
    totalExp: value.totalExp,
    currency: value.currency.map(reward),
    items: value.items.map(reward)
  };
}
function requireParams(bid: string | undefined, uid: number): asserts bid is string {
  if (!bid || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('秘境扫荡请求参数无效');
  }
}
export async function sweepBackendDungeon(
  bid: string | undefined,
  uid: number,
  dungeonName: string,
  times: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<DungeonSweep> {
  requireParams(bid, uid);

  return parseDungeonSweep(
    await requestBackend(bid, 'post_players_id_dungeons_sweep', {
      headers: repeatPresentationHeaders(repeatCommand),
      path: { id: uid },
      body: { dungeonName, times },
      ...writeContext(request)
    })
  );
}
export async function sweepBackendFreeDungeons(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<DungeonFreeSweep> {
  requireParams(bid, uid);
  const value = await requestBackend(bid, 'post_players_id_dungeons_sweep_free', {
    headers: repeatPresentationHeaders(repeatCommand),
    path: { id: uid },
    ...writeContext(request)
  });

  return parseDungeonFreeSweep(value);
}

export function parseDungeonFreeSweep(value: unknown): DungeonFreeSweep {
  if (!record(value) || !Array.isArray(value.sweptDungeons) || !integer(value.totalTimes) || !integer(value.totalExp) || !integer(value.totalSpiritCost)) {
    throw new Error('免费秘境扫荡响应不完整');
  }

  const skipped = value.skippedDungeons === undefined ? [] : value.skippedDungeons;

  if (!Array.isArray(skipped)) {
    throw new Error('免费秘境扫荡未完成记录响应不完整');
  }
  const skippedDungeons = skipped.map(item => {
    if (!record(item) || typeof item.dungeonName !== 'string' || typeof item.message !== 'string') {
      throw new Error('免费秘境扫荡未完成记录响应不完整');
    }

    return { dungeonName: item.dungeonName, message: item.message };
  });

  return {
    treasureEffects: parseTreasureEffects(value.treasureEffects),
    normalExperienceGained: parseNormalExperienceGained(value.normalExperienceGained),
    skippedDungeons,
    sweptDungeons: value.sweptDungeons.map(parseDungeonSweep),
    totalTimes: value.totalTimes,
    totalExp: value.totalExp,
    totalSpiritCost: value.totalSpiritCost
  };
}
