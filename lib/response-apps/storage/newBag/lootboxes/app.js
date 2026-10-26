import { getBackendLootboxes } from "../../../../api/bot/queries.js";
import "../../../../api/bot/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/storage/newBag/lootboxes/app.ts
async function App(params) {
	try {
		const result = await getBackendLootboxes(params.bid, params.uid, params.page);
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
		logger.error("查询礼盒失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };