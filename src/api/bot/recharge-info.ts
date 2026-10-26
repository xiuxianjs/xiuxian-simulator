import { parseBackendRechargeCatalog } from './recharge-catalog-queries';

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

type ActivityRechargeDisplay = {
  eventTitle: string;
  subActivityId: number;
  subTitle: string;
  packages: Array<{
    tierLevel: number;
    yuan: number;
    limitPerUser: number;
    boughtCount: number;
    limitText: string;
    rewardParts: string[];
  }>;
};

export type RechargeInfoResult =
  | { code: 'PRIVATE_ONLY' }
  | { code: 'FAILED' }
  | {
      code: 'OK';
      normalPackages: PackageDisplay[];
      activityPackages: ActivityRechargeDisplay[];
      monthCard: MonthCardDisplay | null;
      seclusionPass: SeclusionPassDisplay | null;
      firstChargePackages: PackageDisplay[];
      sponsor: {
        totalYuan: number;
        thresholdYuan: number;
        remainingYuan: number;
        hasThemePermission: boolean;
      };
      benefitView: {
        sponsorIntro: string;
        monthCardPrivilegeLines: string[];
        seclusionPassPrivilegeLines: string[];
        seclusionPassFallbackLine: string;
      };
    };

export function parseRobotRechargeCatalog(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('充值目录响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (typeof row.showNewcomerRebate !== 'boolean' || typeof row.showWeeklyRebate !== 'boolean') {
    throw new Error('充值导航响应不完整');
  }
  const data = parseBackendRechargeCatalog(row.catalog);
  const result = presentRechargeCatalog(data);

  return { ...result, showNewcomerRebate: row.showNewcomerRebate, showWeeklyRebate: row.showWeeklyRebate };
}

function presentRechargeCatalog(data: ReturnType<typeof parseBackendRechargeCatalog>): Extract<RechargeInfoResult, { code: 'OK' }> {
  const allPackages = data.packages;
  const activityPackagesRaw = data.activityPackages;
  const sponsorStatus = data.sponsor;
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

  const activityPackages: ActivityRechargeDisplay[] = activityPackagesRaw.map(group => ({
    eventTitle: group.eventTitle,
    subActivityId: group.subActivityId,
    subTitle: group.subTitle,
    packages: group.packages.map(pkg => ({
      tierLevel: pkg.tierLevel,
      yuan: pkg.rechargeAmountYuan,
      limitPerUser: pkg.limitPerUser,
      boughtCount: pkg.boughtCount,
      limitText: pkg.limitText,
      rewardParts: pkg.rewardTextParts.filter(Boolean)
    }))
  }));

  return {
    code: 'OK',
    normalPackages,
    activityPackages,
    monthCard,
    seclusionPass,
    firstChargePackages,
    sponsor: {
      totalYuan: sponsorStatus.totalYuan,
      thresholdYuan: sponsorStatus.thresholdYuan,
      remainingYuan: sponsorStatus.remainingYuan,
      hasThemePermission: sponsorStatus.hasThemePermission
    },
    benefitView: data.benefitView
  };
}
