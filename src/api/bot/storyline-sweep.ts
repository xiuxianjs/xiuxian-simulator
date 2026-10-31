import { repeatPresentationHeaders } from './repeat-presentation';
import { parseNormalExperienceGained, parseTreasureEffects, type TreasureEffectNotice } from './treasure-effects';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendStorylineSweepItem = { itemId: number; amount: number; name: string };
export type BackendStorylineSweep = {
  treasureEffects?: TreasureEffectNotice[];
  normalExperienceGained?: number;
  stageLabel: string;
  times: number;
  totalSpiritCost: number;
  totalExp: number;
  totalSpiritStone: number;
  /** Signed adjustment to the base reward; the experience cap can make it negative. */
  totalBonusExp: number;
  expBonusText: string;
  allItemsGained: BackendStorylineSweepItem[];
};
const row = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('主线扫荡响应不完整');
  }

  return value as Record<string, unknown>;
};
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

function item(value: unknown): BackendStorylineSweepItem {
  const data = row(value);

  if (!nonnegative(data.itemId) || !nonnegative(data.amount) || typeof data.name !== 'string') {
    throw new Error('主线扫荡掉落响应不完整');
  }

  return { itemId: data.itemId, amount: data.amount, name: data.name };
}
export function parseStorylineSweep(value: unknown): BackendStorylineSweep {
  const data = row(value);

  if (
    typeof data.stageLabel !== 'string' ||
    !nonnegative(data.times) ||
    !nonnegative(data.totalSpiritCost) ||
    !nonnegative(data.totalExp) ||
    !nonnegative(data.totalSpiritStone) ||
    !integer(data.totalBonusExp) ||
    !nonnegative(data.totalExp + data.totalBonusExp) ||
    typeof data.expBonusText !== 'string' ||
    !Array.isArray(data.allItemsGained)
  ) {
    throw new Error('主线扫荡响应不完整');
  }

  return {
    treasureEffects: parseTreasureEffects(data.treasureEffects),
    normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
    stageLabel: data.stageLabel,
    times: data.times,
    totalSpiritCost: data.totalSpiritCost,
    totalExp: data.totalExp,
    totalSpiritStone: data.totalSpiritStone,
    totalBonusExp: data.totalBonusExp,
    expBonusText: data.expBonusText,
    allItemsGained: data.allItemsGained.map(item)
  };
}
export async function sweepBackendStoryline(
  bid: string | undefined,
  uid: number,
  chapterNumber: number,
  stageNumber: number,
  times: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<BackendStorylineSweep> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('主线扫荡操作参数无效');
  }

  return parseStorylineSweep(
    await requestBackend(bid, 'post_players_id_storyline_sweep', {
      path: { id: uid },
      body: { chapterNumber, stageNumber, times },
      headers: repeatPresentationHeaders(repeatCommand),
      ...writeContext(request)
    })
  );
}

export function parseStorylineSweepBusiness(value: unknown) {
  const data = row(value);

  if (data.outcome === 'ignored') {
    return { ignored: true as const };
  }
  if (
    !(typeof data.chapterNumber === 'number' && Number.isInteger(data.chapterNumber) && Number.isFinite(data.chapterNumber)) ||
    data.chapterNumber < 1 ||
    !nonnegative(data.stageNumber) ||
    data.stageNumber < 1 ||
    data.stageNumber > 4
  ) {
    throw new Error('主线扫荡响应不完整');
  }

  return { ignored: false as const, chapterNumber: data.chapterNumber, stageNumber: data.stageNumber, result: parseStorylineSweep(data.result) };
}
