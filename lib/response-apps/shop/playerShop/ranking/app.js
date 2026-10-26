import { getBackendShopRanking } from "../../../../api/bot/shop-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/shop/playerShop/ranking/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { ranking: await getBackendShopRanking(params.bid, params.limit) }
		};
	} catch (error) {
		logger.error("小店排行失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "获取排行榜失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };