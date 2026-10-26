import { runRobotBusiness } from "../../../../response/robotBusiness.js";
import { validateRobotPreference } from "../../../../api/bot/settings-robot-query.js";
import { logger } from "alemonjs";

//#region src/response-apps/message/config/teamPreferences/app.ts
async function App(params) {
	try {
		const action = params.action;
		const operations = {
			AUTO_APPROVE_FRIEND_TEAM: "settings.friend-team-approval",
			TEAM_INVITE_ENABLED: "settings.team-invites",
			TEAM_DUNGEON_NO_MENTAL: "settings.team-dungeon-energy"
		};
		const fields = {
			AUTO_APPROVE_FRIEND_TEAM: "autoApproveFriendTeam",
			TEAM_INVITE_ENABLED: "teamInviteEnabled",
			TEAM_DUNGEON_NO_MENTAL: "teamDungeonNoMental"
		};
		const response = await runRobotBusiness(params.event, operations[action.type], { value: action.enabled }, (data) => validateRobotPreference(data, fields[action.type], action.enabled, action), params.next);
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