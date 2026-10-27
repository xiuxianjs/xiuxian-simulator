import { requestGuildWorkflow } from "../../../api/bot/guild-workflow.js";
import { MSG_GUILD } from "../../../constants/messages.js";

//#region src/response-apps/guild/addEssence/app.ts
async function App(params) {
	try {
		const result = await requestGuildWorkflow(params.bid, params.uid, {
			action: "essence_add",
			content: params.content
		}, params.request, params.repeatCommand);
		return {
			code: "OK",
			data: { message: {
				added: "宗门精华添加成功",
				too_long: MSG_GUILD.ESSENCE_TOO_LONG,
				empty: MSG_GUILD.ESSENCE_EMPTY,
				inappropriate: MSG_GUILD.ESSENCE_INAPPROPRIATE,
				not_joined: MSG_GUILD.NOT_JOINED,
				limit_reached: MSG_GUILD.ESSENCE_LIMIT,
				permission_denied: MSG_GUILD.ONLY_ELDER_OR_ABOVE,
				permission_check_failed: MSG_GUILD.PERMISSION_CHECK_FAILED
			}[result.outcome] }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "添加精华失败" }
		};
	}
}

//#endregion
export { App as default };