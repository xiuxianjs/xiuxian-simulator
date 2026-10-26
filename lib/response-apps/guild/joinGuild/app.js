import { applyBackendGuild } from "../../../api/bot/guild-membership-mutations.js";

//#region src/response-apps/guild/joinGuild/app.ts
async function App(params) {
	try {
		const result = await applyBackendGuild(params.bid, params.uid, params.guildId, params.request, params.repeatCommand);
		return {
			code: "OK",
			data: {
				success: true,
				message: `已向【${result.guildName}】提交加入申请，请等待审核`,
				guildName: result.guildName,
				levelName: result.levelName,
				memberCount: result.memberCount
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "申请加入宗门失败" }
		};
	}
}

//#endregion
export { App as default };