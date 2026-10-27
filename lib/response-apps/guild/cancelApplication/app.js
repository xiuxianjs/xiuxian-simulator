import { getBackendGuildApplications } from "../../../api/bot/guild-application-queries.js";
import { cancelBackendGuildApplication } from "../../../api/bot/guild-application-cancel.js";
import { MSG_GUILD } from "../../../constants/messages.js";

//#region src/response-apps/guild/cancelApplication/app.ts
async function App(params) {
	try {
		if (params.applicationId === null) return {
			code: "LIST",
			data: { pendingApps: (await getBackendGuildApplications(params.bid, params.uid)).applications.map((row) => ({
				id: row.id,
				guildId: row.guildId,
				guildName: row.guildNameText,
				status: row.statusText
			})) }
		};
		const result = await cancelBackendGuildApplication(params.bid, params.uid, params.applicationId, params.request, params.repeatCommand);
		const message = result.outcome === "not_pending" ? MSG_GUILD.APPLICATION_NOT_FOUND : result.guildExists ? `已取消对【${result.guildName}】的加入申请` : "已取消申请";
		return {
			code: "OK",
			data: {
				success: result.outcome === "cancelled",
				message
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "取消申请失败" }
		};
	}
}

//#endregion
export { App as default };