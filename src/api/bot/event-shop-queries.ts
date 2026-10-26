import { requestBackend } from './client';
import { parseLimitedEventRewardFields, parseLimitedEventRewardNames } from './limited-event-reward-parser';
import type { EventShopQueryGroup } from '../schemas/event-shop-query';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('活动商店接口不完整');
  }

  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('活动商店接口缺少文本');
  }

  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('活动商店接口缺少数值');
  }

  return value;
}
function textParts(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(part => typeof part !== 'string')) {
    throw new Error('活动商店接口缺少奖励描述');
  }

  return value as string[];
}
function detailCommands(value: unknown): Array<{ label: string; command: string }> {
  if (!Array.isArray(value)) {
    throw new Error('活动商店接口缺少详情入口');
  }

  return value.map(item => ({ label: text(object(item).label), command: text(object(item).command) }));
}
export async function getBackendEventShop(bid: string | undefined, uid: number, shopType: number): Promise<EventShopQueryGroup[]> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendEventShop(await requestBackend(bid, 'get_players_id_limited_events_shop_products', { path: { id: uid }, query: { shopType } }));
}
export function parseBackendEventShop(data: unknown): EventShopQueryGroup[] {
  if (!Array.isArray(data)) {
    throw new Error('活动商店接口缺少列表');
  }

  return data.map(value => {
    const group = object(value);

    if (!Array.isArray(group.products)) {
      throw new Error('活动商店接口缺少商品');
    }

    return {
      eventId: number(group.eventId),
      eventTitle: text(group.eventTitle),
      paidTokenName: text(group.paidTokenName),
      freeTokenName: text(group.freeTokenName),
      shopType: number(group.shopType),
      shopName: text(group.shopName),
      rewardNames: parseLimitedEventRewardNames(group.rewardNames),
      products: group.products.map(value => {
        const row = object(value);

        return {
          productId: number(row.productId),
          subActivityId: number(row.subActivityId),
          productName: text(row.productName),
          priceType: text(row.priceType),
          priceAmount: number(row.priceAmount),
          limitPerUser: number(row.limitPerUser),
          stockTotal: number(row.stockTotal),
          stockRemain: number(row.stockRemain),
          userBought: number(row.userBought),
          rewardFields: parseLimitedEventRewardFields(row.rewardFields),
          rewardTextParts: textParts(row.rewardTextParts),
          detailCommands: detailCommands(row.detailCommands),
          priceTypeName: text(row.priceTypeName)
        };
      })
    };
  });
}
