import { getBackendGuilds } from "../../../api/bot/queries.js";
import "../../../api/index.js";

//#region src/response-apps/guild/guildList/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { result: await getBackendGuilds(params.bid, params.page, params.pageSize) }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取宗门列表失败" }
		};
	}
}

//#endregion
export { App as default };