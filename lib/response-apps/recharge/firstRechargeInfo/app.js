import { displayCurrencyText } from "../../../constants/currency.js";
import { getBackendFirstRechargeInfo } from "../../../api/bot/first-recharge-queries.js";

//#region src/response-apps/recharge/firstRechargeInfo/app.ts
const getFirstRechargeInfoData = async (uid, bid) => {
	const { tiers: tierDetails } = await getBackendFirstRechargeInfo(bid, uid);
	return {
		code: "OK",
		tiers: tierDetails.map((tier) => ({
			tierAmountYuan: tier.tierAmountYuan,
			status: tier.status,
			rewardText: displayCurrencyText(tier.rewardText)
		}))
	};
};

//#endregion
export { getFirstRechargeInfoData };