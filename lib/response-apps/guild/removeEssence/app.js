import { requestGuildWorkflow } from "../../../api/bot/guild-workflow.js";
import { MSG_GUILD } from "../../../constants/messages.js";

//#region src/response-apps/guild/removeEssence/app.ts
async function App(params) {
	try {
		const result = await requestGuildWorkflow(params.bid, params.uid, {
			action: "essence_remove",
			essenceId: params.essenceId
		}, params.request, params.repeatCommand);
		return {
			code: "OK",
			data: { message: {
				removed: "宗门精华移除成功",
				not_joined: MSG_GUILD.NOT_JOINED,
				permission_denied: MSG_GUILD.ONLY_ELDER_OR_ABOVE,
				permission_check_failed: MSG_GUILD.PERMISSION_CHECK_FAILED,
				not_found: MSG_GUILD.ESSENCE_NOT_FOUND,
				not_own: MSG_GUILD.ESSENCE_NOT_OWN,
				busy: "获取锁超时，已达到最大重试次数"
			}[result.outcome] }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "移除精华失败" }
		};
	}
}

//#endregion
export { App as default };