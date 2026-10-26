import { parsePositiveIssuedRewards, type IssuedReward } from '../schemas/issued-reward';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type LimitedEventIssuedReward = IssuedReward;

type Row = Record<string, unknown>;

function row(value: unknown, label: string): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}响应不完整`);
  }

  return value as Row;
}

function positive(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label}无效`);
  }

  return value;
}

function issued(value: unknown, label: string): LimitedEventIssuedReward[] {
  return parsePositiveIssuedRewards(value, `${label}奖励响应不完整`);
}

function requireInput(bid: string | undefined, uid: number, value: number, label: string): string {
  const validBid = bid?.trim();

  if (!validBid || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label}参数无效`);
  }

  return validBid;
}

export async function claimBackendLimitedEventTask(bid: string | undefined, uid: number, taskId: number, request?: BackendRequestContext) {
  const validBid = requireInput(bid, uid, taskId, '活动任务领取');
  const result = row(
    await requestBackend(validBid, 'post_players_id_limited_events_tasks_taskId_claim', { path: { id: uid, taskId }, ...writeContext(request) }),
    '活动任务领取'
  );

  return parseBackendLimitedEventTask(result);
}

export function parseBackendLimitedEventTask(value: unknown) {
  const result = row(value, '活动任务领取');

  if (typeof result.eventTitle !== 'string' || typeof result.taskName !== 'string') {
    throw new Error('活动任务领取响应不完整');
  }

  return {
    taskId: positive(result.taskId, '活动任务领取任务'),
    eventTitle: result.eventTitle,
    taskName: result.taskName,
    issued: issued(result.issued, '活动任务领取')
  };
}

export async function buyBackendLimitedEventProduct(
  bid: string | undefined,
  uid: number,
  productId: number,
  buyCount: number,
  request?: BackendRequestContext
) {
  const validBid = requireInput(bid, uid, productId, '活动商品购买');

  if (!Number.isSafeInteger(buyCount) || buyCount <= 0) {
    throw new Error('活动商品购买数量无效');
  }
  const result = row(
    await requestBackend(validBid, 'post_players_id_limited_events_shop_products_productId_purchase', {
      path: { id: uid, productId },
      body: { buyCount },
      ...writeContext(request)
    }),
    '活动商品购买'
  );

  return parseBackendLimitedEventProduct(result);
}

export function parseBackendLimitedEventProduct(value: unknown) {
  const result = row(value, '活动商品购买');

  if (typeof result.priceType !== 'string' || typeof result.totalPrice !== 'number') {
    throw new Error('活动商品购买响应不完整');
  }

  return {
    productId: positive(result.productId, '活动商品'),
    buyCount: positive(result.buyCount, '活动商品购买数量'),
    priceType: result.priceType,
    totalPrice: result.totalPrice,
    issued: issued(result.issued, '活动商品购买')
  };
}

export async function claimBackendLimitedEventRechargeTier(
  bid: string | undefined,
  uid: number,
  subActivityId: number,
  tierLevel: number,
  request?: BackendRequestContext
) {
  const validBid = requireInput(bid, uid, subActivityId, '活动充值领奖');

  if (!Number.isSafeInteger(tierLevel) || tierLevel <= 0) {
    throw new Error('活动充值档位无效');
  }
  const result = row(
    await requestBackend(validBid, 'post_players_id_limited_events_recharge_tiers_subActivityId_claim', {
      path: { id: uid, subActivityId },
      body: { tierLevel },
      ...writeContext(request)
    }),
    '活动充值领奖'
  );

  return parseBackendLimitedEventRechargeTier(result);
}

export function parseBackendLimitedEventRechargeTier(value: unknown) {
  const result = row(value, '活动充值领奖');

  return {
    subActivityId: positive(result.subActivityId, '活动充值子活动'),
    tierLevel: positive(result.tierLevel, '活动充值档位'),
    issued: issued(result.issued, '活动充值领奖')
  };
}
