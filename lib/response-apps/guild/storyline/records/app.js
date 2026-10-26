import { BackendAPIError } from "../../../../api/bot/client.js";
import { getBackendGuildStorylineRecords } from "../../../../api/bot/queries.js";
import "../../../../api/bot/index.js";

//#region src/response-apps/guild/storyline/records/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendGuildStorylineRecords(params.bid, params.uid)
		};
	} catch (error) {
		if (error instanceof BackendAPIError && error.status === 409) return {
			code: "NO_GUILD",
			data: { message: "你当前尚未加入宗门" }
		};
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "读取宗门主线记录失败" }
		};
	}
}

//#endregion
export { App as default };