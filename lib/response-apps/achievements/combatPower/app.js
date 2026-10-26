import { displayCurrencyText } from "../../../constants/currency.js";
import { runRobotBusiness } from "../../../response/robotBusiness.js";
import { validateGuardedAchievement } from "../../../api/bot/achievement-robot-query.js";
import { validateBackendCombatPowerAchievements } from "../../../api/bot/combat-power-achievement-query.js";
import { logger } from "alemonjs";

//#region src/response-apps/achievements/combatPower/app.ts
async function App(params) {
	try {
		const response = await runRobotBusiness(params.event, "achievements.combat-power", {}, (value) => validateGuardedAchievement(value, validateBackendCombatPowerAchievements), params.next);
		if (response.handled) return;
		if (response.data.locked) return {
			code: "LOCKED",
			data: { realmName: response.data.realmName }
		};
		const data = response.data.data;
		return {
			code: "OK",
			data: {
				...data,
				historicalUnclaimed: data.items.some((item) => item.completed && !item.claimed && !item.reachable),
				currentClaimable: data.currentClaimable ? {
					...data.currentClaimable,
					rewardText: displayCurrencyText(data.currentClaimable.rewardText)
				} : null,
				nextTarget: data.nextTarget ? {
					...data.nextTarget,
					rewardText: displayCurrencyText(data.nextTarget.rewardText)
				} : null
			}
		};
	} catch (error) {
		logger.error("查询战力成就失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };