import { requestGuildWorkflow } from "../../../api/bot/guild-workflow.js";
import { MSG_GUILD } from "../../../constants/messages.js";

//#region src/response-apps/guild/setNotice/app.ts
async function App(params) {
	try {
		const result = await requestGuildWorkflow(params.bid, params.uid, {
			action: "content_update",
			field: "notice",
			content: params.notice
		}, params.request, params.repeatCommand);
		return {
			code: "OK",
			data: { message: {
				updated: "宗门公告设置成功",
				too_long: MSG_GUILD.NOTICE_TOO_LONG,
				empty: MSG_GUILD.NOTICE_EMPTY,
				inappropriate: MSG_GUILD.NOTICE_INAPPROPRIATE,
				not_joined: MSG_GUILD.NOT_JOINED,
				permission_denied: MSG_GUILD.ONLY_VICE_OR_ABOVE,
				permission_check_failed: MSG_GUILD.PERMISSION_CHECK_FAILED
			}[result.outcome] }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "设置公告失败" }
		};
	}
}

//#endregion
export { App as default };