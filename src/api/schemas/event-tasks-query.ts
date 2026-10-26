import type { LimitedEventRewardQueryFields, LimitedEventRewardQueryNames } from './limited-event-reward-query';

export type EventTaskQueryItem = {
  taskId: number;
  taskName: string;
  taskDescription: string;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  claimed: boolean;
  canClaim: boolean;
  rewardTextParts: string[];
  rewardFields: LimitedEventRewardQueryFields;
};
export type EventTaskQueryGroup = {
  eventTitle: string;
  subTitle: string;
  paidTokenName: string;
  freeTokenName: string;
  tasks: EventTaskQueryItem[];
  rewardNames: LimitedEventRewardQueryNames;
};
