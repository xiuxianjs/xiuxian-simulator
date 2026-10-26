import { BackendAPIError, requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendLootboxOpenResult = {
  lootboxName: string;
  openCount: number;
  rewards: { category: string; rewardId: number; name: string; quantity: number }[];
};

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
  request: BackendRequestContext
): Promise<BackendLootboxOpenResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  // Reference lookup belongs to Go. This includes the legacy numeric-ID-first,
  // name-fallback behavior and avoids a client-side configuration query.
  const body = { lootboxName: reference, openCount };
  const data = record(await requestBackend(bid, 'post_players_id_lootboxes_open', { path: { id: uid }, body, ...writeContext(request) }));

  return parseLootboxOpen(data);
}

export function parseLootboxOpen(value: unknown): BackendLootboxOpenResult {
  const data = record(value);

  if (typeof data.lootboxName !== 'string' || !Array.isArray(data.rewards)) {
    throw new Error('礼盒接口响应不完整');
  }

  return {
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
