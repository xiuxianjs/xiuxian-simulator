import type { EventRechargeQueryGroup } from './event-recharge-query';
export interface RechargeCatalogPackage {
  id: number;
  name: string;
  priceAmount: number;
  packageType: string;
  description: string | null;
  grantSpiritStone: number;
  grantSpiritCrystal: number;
  grantSpiritMilk: number;
  grantItemsJson: string;
  grantEquipmentsJson: string;
  grantSkillsJson: string;
  resolvedLimitPeriod: 'daily' | 'weekly' | 'monthly' | 'lifetime' | 'unlimited';
  boughtCount: number;
  doubleAvailable: boolean;
  priceYuan: number;
  rewardParts: string[];
  limitText: string;
  doubleText: string;
}
export interface RechargeCatalogQueryData {
  packages: RechargeCatalogPackage[];
  rewardNames: { items: Record<number, string>; equipments: Record<number, string>; skills: Record<number, string> };
  activityPackages: EventRechargeQueryGroup[];
  sponsor: { totalYuan: number; thresholdYuan: number; remainingYuan: number; hasThemePermission: boolean };
  benefitView: {
    sponsorIntro: string;
    monthCardPrivilegeLines: string[];
    seclusionPassPrivilegeLines: string[];
    seclusionPassFallbackLine: string;
  };
}
