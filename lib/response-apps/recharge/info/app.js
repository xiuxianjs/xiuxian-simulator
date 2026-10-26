import { getBackendRechargeCatalog } from "../../../api/bot/recharge-catalog-queries.js";

//#region src/response-apps/recharge/info/app.ts
const getRechargeInfoData = async (uid, isPrivate, bid) => {
	if (!isPrivate) return { code: "PRIVATE_ONLY" };
	const data = await getBackendRechargeCatalog(bid, uid);
	const allPackages = data.packages;
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
	return {
		code: "OK",
		normalPackages,
		monthCard,
		seclusionPass: spPkg ? {
			package: buildPackageDisplay(spPkg),
			instantRewards: spPkg.rewardParts
		} : null,
		firstChargePackages,
		benefitView: data.benefitView
	};
};

//#endregion
export { getRechargeInfoData };