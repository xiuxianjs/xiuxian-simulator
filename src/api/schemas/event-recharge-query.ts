import type { LimitedEventRewardQueryFields, LimitedEventRewardQueryNames } from './limited-event-reward-query';
export interface EventRechargeQueryGroup {
  eventId: number;
  eventTitle: string;
  subActivityId: number;
  subTitle: string;
  paidTokenName: string;
  freeTokenName: string;
  rewardNames: LimitedEventRewardQueryNames;
  packages: {
    tierId: number;
    tierLevel: number;
    rechargeAmountFen: number;
    rechargeAmountYuan: number;
    roundedYuanText: string;
    limitPerUser: number;
    limitText: string;
    boughtCount: number;
    rewardFields: LimitedEventRewardQueryFields;
    rewardTextParts: string[];
  }[];
}
