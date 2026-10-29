import { validateRobotSettingsOverview } from "../../../api/bot/settings-robot-query.js";
import { runRobotBusiness } from "../../../response/robotBusiness.js";
import { logger } from "alemonjs";

//#region src/response-apps/message/settings/app.ts
async function App(params) {
	try {
		const response = await runRobotBusiness(params.event, "settings.overview", { includeGroup: params.includeGroup ?? false }, validateRobotSettingsOverview, params.next);
		if (response.handled) return;
		const overview = response.data;
		const config = overview.preferences;
		return {
			code: "OK",
			data: {
				subscription: overview.subscription,
				groupSnapshot: overview.groupSnapshot,
				groupSnapshotUnavailable: overview.groupSnapshotUnavailable,
				dungeonBattleMode: config.dungeonBattleMode,
				teamDungeonNoMental: config.teamDungeonNoMental,
				meditationAutoBoost: config.meditationAutoBoost === true,
				autoApproveFriendTeam: config.autoApproveFriendTeam,
				hideProfile: config.hideProfile,
				confirmSpiritCrystal: config.confirmSpiritCrystal,
				confirmDaoCrystal: config.confirmDaoCrystal,
				teamInviteEnabled: config.teamInviteEnabled,
				teamAutoAcceptInvite: config.teamAutoAcceptInvite
			}
		};
	} catch (error) {
		logger.error(error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };