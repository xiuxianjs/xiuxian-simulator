export interface FirstRechargeQueryReward {
  type: string;
  currencyCode: string;
  itemId: number;
  quantity: number;
}
export interface FirstRechargeQueryTier {
  tierAmount: number;
  tierAmountYuan: number;
  name: string;
  description: string | null;
  status: 'locked' | 'claimable' | 'claimed';
  rewards: FirstRechargeQueryReward[];
  rewardText: string;
}
export interface FirstRechargeQueryData {
  totalRechargeAmount: number;
  vipLevel: number;
  firstRechargeTime: string | null;
  tiers: FirstRechargeQueryTier[];
  unclaimedTiers: number[];
  names: { items: Record<number, string>; equipments: Record<number, string>; skills: Record<number, string> };
}
