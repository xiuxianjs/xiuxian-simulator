import { getBackendOwnPlayerShop } from "../../../../api/bot/player-shop-own.js";
import { logger } from "alemonjs";

//#region src/response-apps/shop/playerShop/mine/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { shop: await getBackendOwnPlayerShop(params.bid, params.uid, params.request) }
		};
	} catch (error) {
		logger.error("我的小店失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "获取店铺信息失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };