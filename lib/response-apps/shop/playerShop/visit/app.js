import { getBackendPlayerShopVisit } from "../../../../api/bot/player-shop-visit-query.js";
import { logger } from "alemonjs";

//#region src/response-apps/shop/playerShop/visit/app.ts
async function App(params) {
	try {
		const data = await getBackendPlayerShopVisit(params.bid, params.uid, params.targetUid, params.page, params.request);
		if (!data.shop) return {
			code: "NO_SHOP",
			data: { message: "该玩家尚未开店" }
		};
		return {
			code: "OK",
			data
		};
	} catch (error) {
		logger.error("逛店失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "获取店铺信息失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };