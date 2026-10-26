import type { LimitedEventRewardQueryFields, LimitedEventRewardQueryNames } from './limited-event-reward-query';

export type EventShopQueryProduct = {
  productId: number;
  subActivityId: number;
  productName: string;
  priceType: string;
  priceAmount: number;
  limitPerUser: number;
  stockTotal: number;
  stockRemain: number;
  userBought: number;
  rewardFields: LimitedEventRewardQueryFields;
  rewardTextParts: string[];
  detailCommands: Array<{ label: string; command: string }>;
  priceTypeName: string;
};
export type EventShopQueryGroup = {
  eventId: number;
  eventTitle: string;
  paidTokenName: string;
  freeTokenName: string;
  shopType: number;
  shopName: string;
  products: EventShopQueryProduct[];
  rewardNames: LimitedEventRewardQueryNames;
};
