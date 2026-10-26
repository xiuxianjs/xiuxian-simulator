import { getBackendMemories } from "../../api/bot/queries.js";
import "../../api/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/memory/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendMemories(params.bid, params.uid)
		};
	} catch (error) {
		logger.error("我的回忆加载失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };