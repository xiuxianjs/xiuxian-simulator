import { getBackendEventTasks } from "../../../api/bot/event-tasks-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/limitedEvent/tasks/app.ts
async function queryTasks(uid, bid) {
	return await getBackendEventTasks(bid, uid);
}
async function App(params) {
	try {
		return {
			code: "OK",
			data: { taskGroups: await queryTasks(params.uid, params.bid) }
		};
	} catch (error) {
		logger.error("[活动任务] 错误:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看活动任务失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };