import { getBackendGreenBottleStorageCapacity } from './green-bottle-storage-capacity';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
import type { GreenBottleStoreResult } from '../schemas/green-bottle-store';

export type BackendGreenBottleStoreResult = GreenBottleStoreResult;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('小绿瓶存储接口响应不完整');
  }

  return value as Record<string, unknown>;
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`小绿瓶存储接口${field}无效`);
  }

  return value;
}

export async function storeBackendGreenBottle(
  bid: string | undefined,
  uid: number,
  count: number,
  request?: BackendRequestContext
): Promise<BackendGreenBottleStoreResult> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(count) || count < 1) {
    throw new Error('小绿瓶存储参数无效');
  }
  const data = record(
    await requestBackend(bid, 'post_players_id_green_bottle_convert', {
      path: { id: uid },
      body: { count },
      ...writeContext(request)
    })
  );

  if (data.experienceCost === undefined) {
    data.experienceCost = (await getBackendGreenBottleStorageCapacity(bid, uid)).experienceCost;
  }

  return parseGreenBottleStore(data);
}

export function parseGreenBottleStore(data: any): BackendGreenBottleStoreResult {
  if (typeof data.success !== 'boolean' || typeof data.message !== 'string') {
    throw new Error('小绿瓶存储接口响应不完整');
  }

  // 旧幂等回执在 24 小时内可能不含新字段，向 Go 只读投影补取。
  const experienceCost = nonNegativeInteger(data.experienceCost, '经验成本');

  if (experienceCost < 1) {
    throw new Error('小绿瓶存储接口经验成本无效');
  }

  if (!data.success) {
    return { success: false, message: data.message, experienceCost };
  }

  return {
    success: true,
    message: data.message,
    experienceCost,
    converted: nonNegativeInteger(data.converted, '转换数量'),
    remainingExp: nonNegativeInteger(data.remainingExp, '剩余修为'),
    totalBottles: nonNegativeInteger(data.totalBottles, '小绿瓶总数')
  };
}
