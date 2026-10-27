import { displayCurrencyText } from "../../../constants/currency.js";
import { BackendAPIError } from "../../../api/bot/client.js";
import { validateBackendAchievementClaim } from "../../../api/bot/achievement-claim.js";
import { validateGuardedAchievement } from "../../../api/bot/achievement-robot-query.js";
import { runRobotBusiness } from "../../../response/robotBusiness.js";
import { logger } from "alemonjs";

//#region src/response-apps/achievements/claimCombatPower/app.ts
async function App(params) {
	try {
		const response = await runRobotBusiness(params.event, "achievements.claim-combat-power", {}, (value) => validateGuardedAchievement(value, validateBackendAchievementClaim), params.next);
		if (response.handled) return;
		if (response.data.locked) return {
			code: "LOCKED",
			data: { realmName: response.data.realmName }
		};
		const claimed = response.data.data.claimed.map((item) => ({
			achievementName: item.achievementName,
			rewardText: displayCurrencyText(item.rewardText)
		}));
		if (claimed.length <= 0) return {
			code: "NO_CLAIMABLE",
			data: { nextTargetName: "暂无" }
		};
		return {
			code: "OK",
			data: {
				claimed,
				claimedCount: claimed.length
			}
		};
	} catch (error) {
		if (error instanceof BackendAPIError && error.status === 409) return {
			code: "NO_CLAIMABLE",
			data: { nextTargetName: "请使用 /成就 战力 查看下一目标" }
		};
		logger.error("领取战力成就失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };