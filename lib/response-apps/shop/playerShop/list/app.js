import { getBackendShopList } from "../../../../api/bot/shop-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/shop/playerShop/list/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendShopList(params.bid, params.page)
		};
	} catch (error) {
		logger.error("小店列表失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "获取店铺列表失败" }
		};
	}
}

//#endregion
export { App as default };