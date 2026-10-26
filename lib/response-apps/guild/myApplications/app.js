import { getBackendGuildApplications } from "../../../api/bot/guild-application-queries.js";

//#region src/response-apps/guild/myApplications/app.ts
async function App(params) {
	try {
		const guildInfo = await getBackendGuildApplications(params.bid, params.uid);
		if (guildInfo.hasGuild) return {
			code: "HAS_GUILD",
			data: { guildName: guildInfo.guildNameText }
		};
		return {
			code: "OK",
			data: { applications: guildInfo.applications.map((row) => ({
				id: row.id,
				guildId: row.guildId,
				guildName: row.guildNameText,
				status: row.statusText,
				createdDateText: row.createdDateText,
				canCancel: row.canCancel
			})) }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取申请列表失败" }
		};
	}
}

//#endregion
export { App as default };