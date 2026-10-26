import { getBackendGuildWeeklyTask } from "../../../api/bot/guild-weekly-task-query.js";
import { presentGuildWeekly } from "../../../api/bot/guild-daily-robot-query.js";

//#region src/response-apps/guild/weekly/app.ts
async function App(params) {
	try {
		const result = await getBackendGuildWeeklyTask(params.bid, params.uid);
		return presentGuildWeekly(result);
	} catch (error) {
		if (error?.status === 409 || error?.code === "CONFLICT") return {
			code: "NO_GUILD",
			data: { message: "你还没有加入宗门。" }
		};
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取宗门周常失败" }
		};
	}
}

//#endregion
export { App as default };