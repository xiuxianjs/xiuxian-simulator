import { parseBackendRechargeCatalog } from "./recharge-catalog-queries.js";

//#region src/api/bot/recharge-info.ts
function parseRobotRechargeCatalog(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("充值目录响应不完整");
	const row = value;
	if (typeof row.showNewcomerRebate !== "boolean" || typeof row.showWeeklyRebate !== "boolean") throw new Error("充值导航响应不完整");
	return {
		...presentRechargeCatalog(parseBackendRechargeCatalog(row.catalog)),
		showNewcomerRebate: row.showNewcomerRebate,
		showWeeklyRebate: row.showWeeklyRebate
	};
}
function presentRechargeCatalog(data) {
	const allPackages = data.packages;
	const activityPackagesRaw = data.activityPackages;
	const sponsorStatus = data.sponsor;
	const buildPackageDisplay = (pkg) => ({
		id: pkg.id,
		name: pkg.name,
		yuan: pkg.priceYuan,
		description: pkg.description,
		rewardParts: pkg.rewardParts,
		limitText: pkg.limitText,
		doubleText: pkg.doubleText
	});
	const normalPackages = allPackages.filter((pkg) => pkg.packageType === "normal").map(buildPackageDisplay);
	const firstChargePackages = allPackages.filter((pkg) => pkg.packageType === "first_charge").map(buildPackageDisplay);
	const mcPkg = allPackages.find((pkg) => pkg.packageType === "month_card");
	const monthCard = mcPkg ? {
		package: buildPackageDisplay(mcPkg),
		instantRewards: mcPkg.rewardParts
	} : null;
	const spPkg = allPackages.find((pkg) => pkg.packageType === "seclusion_pass");
	const seclusionPass = spPkg ? {
		package: buildPackageDisplay(spPkg),
		instantRewards: spPkg.rewardParts
	} : null;
	return {
		code: "OK",
		normalPackages,
		activityPackages: activityPackagesRaw.map((group) => ({
			eventTitle: group.eventTitle,
			subActivityId: group.subActivityId,
			subTitle: group.subTitle,
			packages: group.packages.map((pkg) => ({
				tierLevel: pkg.tierLevel,
				yuan: pkg.rechargeAmountYuan,
				limitPerUser: pkg.limitPerUser,
				boughtCount: pkg.boughtCount,
				limitText: pkg.limitText,
				rewardParts: pkg.rewardTextParts.filter(Boolean)
			}))
		})),
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

//#endregion
export { parseRobotRechargeCatalog };