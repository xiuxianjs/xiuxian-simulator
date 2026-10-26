import { getBackendGuildAccess } from "../../../api/bot/queries.js";
import { postBackendGuildCheckin } from "../../../api/bot/guild-checkin.js";

//#region src/response-apps/guild/checkin/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await postBackendGuildCheckin(params.bid, params.uid, params.request, params.repeatCommand)).message }
		};
	} catch (error) {
		if (error?.code === "GUILD_NOT_MEMBER") try {
			const access = await getBackendGuildAccess(params.bid, params.uid);
			return {
				code: "NOT_IN_GUILD",
				data: {
					message: error.message,
					canCreateOrApplyGuild: access.ok
				}
			};
		} catch (accessError) {
			return {
				code: "LOAD_FAILED",
				data: { message: accessError?.message ?? "宗门资格查询失败" }
			};
		}
		if (error?.code === "GUILD_ALREADY_CHECKED_IN") return {
			code: "OK",
			data: { message: error.message }
		};
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "签到失败" }
		};
	}
}

//#endregion
export { App as default };