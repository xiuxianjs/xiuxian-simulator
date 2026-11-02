import { MSG_GUILD } from "../../../constants/messages.js";
import { requestGuildWorkflow } from "../../../api/bot/guild-workflow.js";
import { presentGuildEssences } from "../../../api/bot/guild-content-robot-query.js";

//#region src/response-apps/guild/viewEssences/app.ts
async function App(params) {
	try {
		const result = await requestGuildWorkflow(params.bid, params.uid, {
			action: "essences",
			page: params.page
		}, params.request);
		if (!result.hasMembership) return {
			code: "FAIL",
			data: { message: MSG_GUILD.NOT_JOINED }
		};
		return {
			code: "OK",
			data: { result: presentGuildEssences(result) }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "查询精华失败" }
		};
	}
}

//#endregion
export { App as default };