import { BackendAPIError, requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parseLootboxSelection, type LootboxTreasureSelection } from '../schemas/lootbox-selection';

export type BackendLootboxOpenResult = {
  lootboxId?: number;
  lootboxName: string;
  openCount: number;
  rewards: { category: string; rewardId: number; name: string; quantity: number }[];
  selection?: LootboxTreasureSelection;
};

export function lootboxTreasureArgument(parts: string[]): number | undefined {
  if (parts.length < 3) {
    return undefined;
  }
  const treasureId = Number(parts[2]);

  if (parts.length !== 3 || !Number.isSafeInteger(treasureId) || treasureId < 1 || !/^\d+$/.test(parts[2]) || Number(parts[1]) !== 1) {
    throw new Error('自选宝盒每次只能开启1个，请使用 /开启礼盒 礼盒ID 1 宝物ID');
  }

  return treasureId;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('礼盒接口响应不完整');
  }

  return value as Record<string, unknown>;
}

function integer(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`礼盒接口字段无效: ${field}`);
  }

  return value;
}

export async function openBackendLootbox(
  bid: string | undefined,
  uid: number,
  reference: string,
  openCount: number | undefined,
  request: BackendRequestContext,
  treasureId?: number
): Promise<BackendLootboxOpenResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  if (treasureId !== undefined && (!Number.isSafeInteger(treasureId) || treasureId < 1 || openCount !== 1)) {
    throw new Error('自选宝盒每次只能开启1个，宝物ID必须为正整数');
  }

  // Reference lookup belongs to Go. This includes the legacy numeric-ID-first,
  // name-fallback behavior and avoids a client-side configuration query.
  const body = { lootboxName: reference, openCount, ...(treasureId === undefined ? {} : { treasureId }) };
  const data = record(await requestBackend(bid, 'post_players_id_lootboxes_open', { path: { id: uid }, body, ...writeContext(request) }));

  return parseLootboxOpen(data);
}

export function parseLootboxOpen(value: unknown): BackendLootboxOpenResult {
  const data = record(value);

  if (typeof data.lootboxName !== 'string' || !Array.isArray(data.rewards)) {
    throw new Error('礼盒接口响应不完整');
  }

  const result: BackendLootboxOpenResult = {
    lootboxName: data.lootboxName,
    openCount: integer(data.openCount, 'openCount'),
    rewards: data.rewards.map(value => {
      const reward = record(value);

      if (typeof reward.category !== 'string' || typeof reward.name !== 'string') {
        throw new Error('礼盒奖励响应不完整');
      }

      return { category: reward.category, rewardId: integer(reward.rewardId, 'rewardId'), name: reward.name, quantity: integer(reward.quantity, 'quantity') };
    })
  };

  if (data.lootboxId !== undefined) {
    result.lootboxId = integer(data.lootboxId, 'lootboxId');
    if (result.lootboxId < 1) {
      throw new Error('宝盒编号无效');
    }
  }
  if (data.selection !== undefined) {
    result.selection = parseLootboxSelection(data.selection);
    if (!result.lootboxId || result.openCount !== 0 || result.rewards.length !== 0) {
      throw new Error('宝盒自选预览不完整');
    }
  }

  return result;
}

export function lootboxExpectedFailure(error: unknown): { code: 'NOT_FOUND'; nameOrId: string } | { code: 'NOT_OWNED'; lootboxName: string } | null {
  if (!(error instanceof BackendAPIError) || !error.details || typeof error.details !== 'object' || Array.isArray(error.details)) {
    return null;
  }

  const details = error.details as Record<string, unknown>;

  if (error.status === 404 && error.code === 'LOOTBOX_NOT_FOUND' && typeof details.nameOrId === 'string') {
    return { code: 'NOT_FOUND', nameOrId: details.nameOrId };
  }
  if (error.status === 409 && error.code === 'LOOTBOX_NOT_OWNED' && typeof details.lootboxName === 'string') {
    return { code: 'NOT_OWNED', lootboxName: details.lootboxName };
  }

  return null;
}
