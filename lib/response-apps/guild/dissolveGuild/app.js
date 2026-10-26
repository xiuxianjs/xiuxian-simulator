import { requestGuildWorkflow } from "../../../api/bot/guild-workflow.js";

//#region src/response-apps/guild/dissolveGuild/app.ts
async function App(params) {
	try {
		const result = await requestGuildWorkflow(params.bid, params.uid, { action: "dissolve" }, params.request, params.repeatCommand);
		if (result.outcome === "not_joined") return {
			code: "NOT_JOINED",
			data: { message: "您还没有加入任何宗门" }
		};
		if (result.outcome === "confirmation_required") return {
			code: "FIRST_CONFIRM",
			data: { guildName: result.guildName }
		};
		return {
			code: "OK",
			data: {
				success: true,
				message: result.message
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "解散宗门失败" }
		};
	}
}

//#endregion
export { App as default };