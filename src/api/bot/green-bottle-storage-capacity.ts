import { requestBackend } from './client';
import type { GreenBottleStorageCapacityQuery } from '../schemas/green-bottle-storage-capacity-query';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('小绿瓶存储容量响应不完整');
  }

  return value as Record<string, unknown>;
}

function integer(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`小绿瓶存储容量${field}不完整`);
  }

  return value;
}

export async function getBackendGreenBottleStorageCapacity(bid: string | undefined, uid: number): Promise<GreenBottleStorageCapacityQuery> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = record(await requestBackend(bid, 'get_players_id_green_bottle_storage_capacity', { path: { id: uid } }));

  return parseGreenBottleCapacity(data);
}

export function parseGreenBottleCapacity(data: any): GreenBottleStorageCapacityQuery {
  const experienceCost = integer(data.experienceCost, '经验成本');

  if (experienceCost < 1) {
    throw new Error('小绿瓶存储容量经验成本无效');
  }
  const maxAvailable = integer(data.maxAvailable, '可存储数量');

  if (typeof data.canStore !== 'boolean') {
    throw new Error('小绿瓶存储容量状态不完整');
  }
  if (data.canStore !== maxAvailable > 0) {
    throw new Error('小绿瓶存储容量状态不一致');
  }

  return { experienceCost, maxAvailable, canStore: data.canStore };
}
