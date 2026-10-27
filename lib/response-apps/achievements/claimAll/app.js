import { displayCurrencyText } from "../../../constants/currency.js";
import { BackendAPIError } from "../../../api/bot/client.js";
import { validateGuardedAchievement } from "../../../api/bot/achievement-robot-query.js";
import { validateBackendAchievementClaim } from "../../../api/bot/achievement-claim.js";
import { runRobotBusiness } from "../../../response/robotBusiness.js";
import { logger } from "alemonjs";

//#region src/response-apps/achievements/claimAll/app.ts
async function App(params) {
	try {
		const response = await runRobotBusiness(params.event, "achievements.claim-all", {}, (value) => validateGuardedAchievement(value, validateBackendAchievementClaim), params.next);
		if (response.handled) return;
		if (response.data.locked) return {
			code: "LOCKED",
			data: { realmName: response.data.realmName }
		};
		const result = response.data.data;
		if (result.claimed.length <= 0) return { code: "NO_CLAIMABLE" };
		return {
			code: "OK",
			data: {
				claimed: result.claimed.map((item) => ({
					...item,
					rewardText: displayCurrencyText(item.rewardText)
				})),
				claimedCount: result.claimed.length
			}
		};
	} catch (error) {
		if (error instanceof BackendAPIError && error.status === 409) return { code: "NO_CLAIMABLE" };
		logger.error("一键领取成就失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };