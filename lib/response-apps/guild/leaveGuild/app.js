import { leaveBackendGuild } from "../../../api/bot/guild-member-lifecycle.js";

//#region src/response-apps/guild/leaveGuild/app.ts
async function App(params) {
	try {
		const result = await leaveBackendGuild(params.bid, params.uid, params.request, params.repeatCommand);
		if (result.outcome === "confirmation_required") return {
			code: "FIRST_CONFIRM",
			data: { guildName: result.guildName }
		};
		return {
			code: "OK",
			data: {
				success: result.outcome === "left",
				message: result.message
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "退出宗门失败" }
		};
	}
}

//#endregion
export { App as default };