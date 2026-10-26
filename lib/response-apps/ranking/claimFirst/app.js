import { EMPTY_STRING, FIRST_ARG_INDEX } from "../../../constants/common.js";
import "../../../constants/index.js";
import { claimBackendFirstRewards } from "../../../api/bot/tower-reward-claims.js";

//#region src/response-apps/ranking/claimFirst/app.ts
async function App(params) {
	const { bid, uid, messageText, request } = params;
	const text = (messageText || "").replace(/^(!|！|\/|#|＃)?领取首通奖励\s*/, "").trim();
	const args = text ? text.split(/\s+/) : [];
	const rankingStr = args[0];
	if (args.length > 1) return { code: "PARAM_ERROR" };
	if (!rankingStr || rankingStr === "全部" || rankingStr === "all") try {
		const result = await claimBackendFirstRewards(bid, uid, "all", request);
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
	const ranking = Number(rankingStr);
	if (!/^\d+$/.test(rankingStr) || !Number.isSafeInteger(ranking) || ranking <= 0) return { code: "PARAM_ERROR" };
	try {
		return {
			code: "SUCCESS",
			data: {
				ranking,
				rewardTexts: (await claimBackendFirstRewards(bid, uid, ranking, request)).rewardTexts
			}
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