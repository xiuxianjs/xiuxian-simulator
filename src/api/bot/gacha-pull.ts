import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendGachaPullItem = {
  tierName: string;
  tierLabel: string;
  itemName: string;
  itemType: string;
  quantity: number;
  isUp: boolean;
};

export type BackendGachaPullResult =
  | { success: true; message: string; items: BackendGachaPullItem[]; freeUsed: number; costAmount: number; costCurrency: string; costCurrencyName: string }
  | { success: false; reason: string; message: string };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('转盘接口响应不完整');
  }

  return value as Record<string, unknown>;
}

function integer(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`转盘接口字段无效: ${field}`);
  }

  return value;
}

function item(value: unknown): BackendGachaPullItem {
  const row = record(value);

  for (const field of ['tierName', 'tierLabel', 'itemName', 'itemType'] as const) {
    if (typeof row[field] !== 'string') {
      throw new Error(`转盘接口展示字段无效: ${field}`);
    }
  }
  if (typeof row.isUp !== 'boolean') {
    throw new Error('转盘接口展示字段无效: isUp');
  }

  return {
    tierName: row.tierName as string,
    tierLabel: row.tierLabel as string,
    itemName: row.itemName as string,
    itemType: row.itemType as string,
    quantity: integer(row.quantity, 'quantity'),
    isUp: row.isUp
  };
}

export async function pullBackendGacha(
  bid: string | undefined,
  uid: number,
  poolId: number,
  count: 1 | 10,
  request?: BackendRequestContext
): Promise<BackendGachaPullResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  const data = record(
    await requestBackend(bid, 'post_players_id_gacha_pools_poolId_pull', {
      path: { id: uid, poolId },
      body: { count },
      ...writeContext(request)
    })
  );

  return parseGachaPullResult(data);
}

export function parseGachaPullResult(value: unknown): BackendGachaPullResult {
  const data = record(value);

  if (data.success === false && typeof data.reason === 'string' && typeof data.message === 'string') {
    return { success: false, reason: data.reason, message: data.message };
  }
  if (
    data.success !== true ||
    typeof data.message !== 'string' ||
    !Array.isArray(data.items) ||
    typeof data.costCurrency !== 'string' ||
    typeof data.costCurrencyName !== 'string'
  ) {
    throw new Error('转盘接口响应不完整');
  }

  return {
    success: true,
    message: data.message,
    items: data.items.map(item),
    freeUsed: integer(data.freeUsed, 'freeUsed'),
    costAmount: integer(data.costAmount, 'costAmount'),
    costCurrency: data.costCurrency,
    costCurrencyName: data.costCurrencyName
  };
}
