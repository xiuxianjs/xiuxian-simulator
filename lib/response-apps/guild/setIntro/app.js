import { requestGuildWorkflow } from "../../../api/bot/guild-workflow.js";
import { MSG_GUILD } from "../../../constants/messages.js";

//#region src/response-apps/guild/setIntro/app.ts
async function App(params) {
	try {
		const result = await requestGuildWorkflow(params.bid, params.uid, {
			action: "content_update",
			field: "intro",
			content: params.intro
		}, params.request, params.repeatCommand);
		return {
			code: "OK",
			data: { message: {
				updated: "宗门简介设置成功",
				too_long: MSG_GUILD.INTRO_TOO_LONG,
				empty: MSG_GUILD.INTRO_EMPTY,
				inappropriate: MSG_GUILD.INTRO_INAPPROPRIATE,
				not_joined: MSG_GUILD.NOT_JOINED,
				permission_denied: MSG_GUILD.ONLY_VICE_OR_ABOVE,
				permission_check_failed: MSG_GUILD.PERMISSION_CHECK_FAILED
			}[result.outcome] }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "设置简介失败" }
		};
	}
}

//#endregion
export { App as default };