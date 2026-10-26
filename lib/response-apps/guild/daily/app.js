import { getBackendGuildDailyTask } from "../../../api/bot/guild-daily-task-query.js";

//#region src/response-apps/guild/daily/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendGuildDailyTask(params.bid, params.uid)
		};
	} catch (error) {
		if (error?.code === "GUILD_NOT_MEMBER") return {
			code: "NO_GUILD",
			data: { message: error.message }
		};
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取宗门日常失败" }
		};
	}
}

//#endregion
export { App as default };