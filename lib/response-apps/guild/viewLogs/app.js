import { getBackendGuildLogs } from "../../../api/bot/queries.js";
import { PAGE_SIZE } from "../../../constants/common.js";
import "../../../constants/index.js";
import "../../../api/index.js";

//#region src/response-apps/guild/viewLogs/app.ts
async function App(params) {
	try {
		const data = await getBackendGuildLogs(params.bid, params.uid, params.page, 5);
		if (!data.hasGuild) return {
			code: "NO_GUILD",
			data: { message: "您还未加入宗门" }
		};
		const { logs, total, page, totalPages, guildName } = data;
		return {
			code: "OK",
			data: {
				guildName,
				logs,
				total,
				page,
				totalPages
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取日志失败" }
		};
	}
}

//#endregion
export { App as default };