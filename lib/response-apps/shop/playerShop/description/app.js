import { updateBackendPlayerShopDescription } from "../../../../api/bot/player-shop-description.js";
import { logger } from "alemonjs";

//#region src/response-apps/shop/playerShop/description/app.ts
async function App(params) {
	try {
		await updateBackendPlayerShopDescription(params.bid, params.uid, params.description, params.request, params.messageText);
		return {
			code: "OK",
			data: { message: "店铺简介已更新" }
		};
	} catch (error) {
		logger.error("更新店铺简介失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "更新简介失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };