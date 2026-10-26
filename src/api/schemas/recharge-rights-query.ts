export interface RechargeRightsReward {
  id: number;
  name: string | null;
  quantity: number;
}

export interface RechargeRightsPackage {
  id: number;
  priceAmount: number;
  grantSpiritStone: number;
  grantSpiritCrystal: number;
  grantSpiritMilk: number;
  items: RechargeRightsReward[];
  skills: RechargeRightsReward[];
}

export interface RechargeRightsCalendarState {
  prepaid?: boolean;
  day: number;
  rewardDate: string;
  state: 'claimed' | 'claimable' | 'upcoming';
}

export interface RechargeRightsDaily {
  prepaidCount?: number;
  reviewRequired?: boolean;
  total: number;
  claimableCount: number;
  claimedCount: number;
  upcomingCount: number;
  calendarState: RechargeRightsCalendarState[];
}

export interface RechargeRightsMonthCard {
  active: boolean;
  expireTime: string | null;
  remainingDays: number;
  totalDays: number;
  maxDays: number;
  remainingQuota: number;
  daily: RechargeRightsDaily;
  package: RechargeRightsPackage | null;
}

export interface RechargeRightsSeclusionPass {
  active: boolean;
  expireTime: string | null;
  remainingDays: number;
  totalDays: number;
  maxDays: number;
  package: RechargeRightsPackage | null;
}

export interface RechargeRightsQueryData {
  name: string;
  vipLevel: number;
  totalRechargeAmount: number;
  nextVipLevel: number | null;
  nextVipThreshold: number | null;
  firstRechargeTime: string | null;
  monthCard: RechargeRightsMonthCard;
  seclusionPass: RechargeRightsSeclusionPass;
  activeThemeConfig: string | null;
  canUseMeridian: boolean;
  canUseSoulPath: boolean;
  progressText: string;
  monthCardInstantRewards: string[];
  seclusionPriceText: string;
  seclusionRewards: string[];
}
