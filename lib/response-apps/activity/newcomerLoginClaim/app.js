import { claimBackendNewcomerLogin } from "../../../api/bot/newcomer-login-actions.js";
import { logger } from "alemonjs";

//#region src/response-apps/activity/newcomerLoginClaim/app.ts
async function App(params) {
	if (!params.uid) return { code: "INVALID_USER" };
	try {
		const result = await claimBackendNewcomerLogin(params.bid, params.uid, params.request);
		const code = result.code;
		if (code !== "OK") return { code };
		if (!Number.isInteger(result.claimDay) || !Number.isFinite(result.spiritCrystal) || !result.grantedItems) throw new Error("新人登录领奖响应不完整");
		return {
			code: "OK",
			data: {
				claimDay: result.claimDay,
				spiritCrystal: result.spiritCrystal,
				grantedItems: result.grantedItems
			}
		};
	} catch (error) {
		logger.error("领取新人登录奖励失败:", error);
		return { code: "CLAIM_FAILED" };
	}
}

//#endregion
export { App as default };