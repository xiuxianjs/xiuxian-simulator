import { EMPTY_STRING, FIRST_ARG_INDEX } from "../../../constants/common.js";
import "../../../constants/index.js";
import { claimBackendMonthlyRewards } from "../../../api/bot/tower-reward-claims.js";

//#region src/response-apps/ranking/claimMonthly/app.ts
async function App(params) {
	const { bid, uid, messageText, request } = params;
	const text = (messageText || "").replace(/^(!|！|\/|#|＃)?领取月度奖励\s*/, "").trim();
	const args = text ? text.split(/\s+/) : [];
	const rewardIdStr = args[0];
	if (args.length > 1) return { code: "PARAM_ERROR" };
	if (!rewardIdStr || rewardIdStr === "全部" || rewardIdStr === "all") try {
		const result = await claimBackendMonthlyRewards(bid, uid, "all", request, messageText);
		return {
			code: "BATCH_SUCCESS",
			data: {
				claimedCount: result.claimedCount ?? 0,
				rewardTexts: result.rewardTexts
			}
		};
	} catch (error) {
		return {
			code: "FAILED",
			message: error?.message ?? "领取失败",
			uid
		};
	}
	const rewardId = Number(rewardIdStr);
	if (!/^\d+$/.test(rewardIdStr) || !Number.isSafeInteger(rewardId) || rewardId <= 0) return { code: "PARAM_ERROR" };
	try {
		return {
			code: "SUCCESS",
			data: { rewardTexts: (await claimBackendMonthlyRewards(bid, uid, rewardId, request, messageText)).rewardTexts }
		};
	} catch (error) {
		return {
			code: "FAILED",
			message: error?.message ?? "领取失败",
			uid
		};
	}
}

//#endregion
export { App as default };