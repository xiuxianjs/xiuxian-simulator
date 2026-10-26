import { runRobotBusiness } from "../../../../response/robotBusiness.js";
import { validateRobotPreference } from "../../../../api/bot/settings-robot-query.js";
import { logger } from "alemonjs";

//#region src/response-apps/message/config/enumPreferences/app.ts
async function App(params) {
	try {
		const action = params.action;
		const dungeon = action.type === "DUNGEON_BATTLE_MODE";
		const value = action.type === "DUNGEON_BATTLE_MODE" ? action.mode : action.rule;
		const response = await runRobotBusiness(params.event, dungeon ? "settings.dungeon-battle-mode" : "settings.team-auto-accept-invite", { value }, (data) => validateRobotPreference(data, dungeon ? "dungeonBattleMode" : "teamAutoAcceptInvite", value, action), params.next);
		return response.handled ? void 0 : {
			code: "OK",
			data: response.data
		};
	} catch (error) {
		logger.error(error);
		return { code: "SET_FAILED" };
	}
}

//#endregion
export { App as default };