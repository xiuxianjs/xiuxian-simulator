import { getBackendRechargeCatalog } from '@src/api/bot/recharge-catalog-queries';

type PackageDisplay = {
  id: number;
  name: string;
  yuan: number;
  description: string | null;
  rewardParts: string[];
  limitText: string;
  doubleText: string;
};

type MonthCardDisplay = {
  package: PackageDisplay;
  instantRewards: string[];
};

type SeclusionPassDisplay = {
  package: PackageDisplay;
  instantRewards: string[];
};

export type RechargeInfoResult =
  | { code: 'PRIVATE_ONLY' }
  | { code: 'FAILED' }
  | {
      code: 'OK';
      normalPackages: PackageDisplay[];
      monthCard: MonthCardDisplay | null;
      seclusionPass: SeclusionPassDisplay | null;
      firstChargePackages: PackageDisplay[];
      benefitView: {
        sponsorIntro: string;
        monthCardPrivilegeLines: string[];
        seclusionPassPrivilegeLines: string[];
        seclusionPassFallbackLine: string;
      };
    };

export const getRechargeInfoData = async (uid: number, isPrivate: boolean, bid?: string): Promise<RechargeInfoResult> => {
  if (!isPrivate) {
    return { code: 'PRIVATE_ONLY' };
  }

  const data = await getBackendRechargeCatalog(bid, uid);
  const allPackages = data.packages;
  const buildPackageDisplay = (pkg: (typeof allPackages)[number]): PackageDisplay => ({
    id: pkg.id,
    name: pkg.name,
    yuan: pkg.priceYuan,
    description: pkg.description,
    rewardParts: pkg.rewardParts,
    limitText: pkg.limitText,
    doubleText: pkg.doubleText
  });

  const normalPackages = allPackages.filter(pkg => pkg.packageType === 'normal').map(buildPackageDisplay);
  const firstChargePackages = allPackages.filter(pkg => pkg.packageType === 'first_charge').map(buildPackageDisplay);
  const mcPkg = allPackages.find(pkg => pkg.packageType === 'month_card');
  const monthCard: MonthCardDisplay | null = mcPkg
    ? {
        package: buildPackageDisplay(mcPkg),
        instantRewards: mcPkg.rewardParts
      }
    : null;

  const spPkg = allPackages.find(pkg => pkg.packageType === 'seclusion_pass');
  const seclusionPass: SeclusionPassDisplay | null = spPkg
    ? {
        package: buildPackageDisplay(spPkg),
        instantRewards: spPkg.rewardParts
      }
    : null;

  return {
    code: 'OK',
    normalPackages,
    monthCard,
    seclusionPass,
    firstChargePackages,
    benefitView: data.benefitView
  };
};
