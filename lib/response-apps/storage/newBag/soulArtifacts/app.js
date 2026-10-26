import { getBackendSoulArtifactBag } from "../../../../api/bot/queries.js";
import "../../../../api/bot/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/storage/newBag/soulArtifacts/app.ts
async function App(params) {
	try {
		const result = await getBackendSoulArtifactBag(params.bid, params.uid, params.page);
		return {
			code: "OK",
			data: {
				page: params.page,
				total: result.total,
				pageSize: result.pageSize,
				items: result.items
			}
		};
	} catch (error) {
		logger.error("查询本命物失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };