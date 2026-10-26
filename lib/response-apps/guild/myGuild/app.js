import { getBackendGuildHome } from "../../../api/bot/guild-home-query.js";

//#region src/response-apps/guild/myGuild/app.ts
async function App(params) {
	try {
		const data = await getBackendGuildHome(params.bid, params.uid);
		if (!data.hasGuild) return {
			code: "NO_GUILD",
			data: {
				message: "您还未加入任何宗门",
				canCreateOrApplyGuild: data.access.canCreateOrApplyGuild
			}
		};
		if (!data.membership || !data.guild) return {
			code: "LOAD_FAILED",
			data: { message: "获取宗门信息失败" }
		};
		return {
			code: "OK",
			data
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取宗门信息失败" }
		};
	}
}

//#endregion
export { App as default };