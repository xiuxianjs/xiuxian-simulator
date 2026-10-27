import { requestGuildWorkflow } from "../../../api/bot/guild-workflow.js";
import { MSG_GUILD } from "../../../constants/messages.js";

//#region src/response-apps/guild/viewIntro/app.ts
async function App(params) {
	try {
		const result = await requestGuildWorkflow(params.bid, params.uid, { action: "content" }, params.request, params.repeatCommand);
		if (!result.hasMembership) return {
			code: "FAIL",
			data: { message: MSG_GUILD.NOT_JOINED }
		};
		return {
			code: "OK",
			data: {
				guildName: result.guildName ?? "",
				intro: result.intro ?? null
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "查询简介失败" }
		};
	}
}

//#endregion
export { App as default };