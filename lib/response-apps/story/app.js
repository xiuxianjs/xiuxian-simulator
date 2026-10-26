import { getBackendStory } from "../../api/bot/queries.js";
import "../../api/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/story/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendStory(params.bid, params.uid)
		};
	} catch (error) {
		logger.error("我的故事加载失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };