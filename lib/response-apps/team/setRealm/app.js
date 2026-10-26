import { MSG_TEAM } from "../../../constants/messages.js";
import { updateBackendTeamRealm } from "../../../api/bot/team-realm-update.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/setRealm/app.ts
async function App(params) {
	try {
		const name = params.realmName === "无" || params.realmName === "取消" ? null : params.realmName;
		const result = await updateBackendTeamRealm(params.bid, params.uid, name, params.request, params.repeatCommand);
		if (result.outcome === "realm_not_found") return { code: "REALM_NOT_FOUND" };
		if (result.outcome === "not_in_team" || result.outcome === "not_leader") return {
			code: "LOAD_FAILED",
			data: { message: result.outcome === "not_in_team" ? MSG_TEAM.NOT_IN_TEAM : MSG_TEAM.NOT_LEADER }
		};
		return {
			code: "OK",
			data: { realmName: result.realmId ? params.realmName : null }
		};
	} catch (error) {
		logger.error("设置队伍境界门槛失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "设置失败" }
		};
	}
}

//#endregion
export { App as default };