import { getBackendFirstRechargeInfo } from '@src/api/bot/first-recharge-queries';
import { displayCurrencyText } from '@src/constants/currency';

type TierDisplay = {
  tierAmountYuan: number;
  status: 'claimable' | 'claimed' | 'locked';
  rewardText: string;
};

export type FirstRechargeInfoResult = { code: 'FAILED' } | { code: 'OK'; tiers: TierDisplay[] };

export const getFirstRechargeInfoData = async (uid: number, bid?: string): Promise<FirstRechargeInfoResult> => {
  const { tiers: tierDetails } = await getBackendFirstRechargeInfo(bid, uid);
  const tiers: TierDisplay[] = tierDetails.map(tier => ({
    tierAmountYuan: tier.tierAmountYuan,
    status: tier.status,
    rewardText: displayCurrencyText(tier.rewardText)
  }));

  return { code: 'OK', tiers };
};
