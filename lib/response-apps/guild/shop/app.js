import { getBackendGuildShopPage } from "../../../api/bot/guild-shop-page.js";
import { buildGuildShopDisplay } from "../../../response/guild/shop/view.js";

//#region src/response-apps/guild/shop/app.ts
async function App(params) {
	try {
		if (params.pageError) return {
			code: "LOAD_FAILED",
			data: { message: params.pageError }
		};
		const page = params.page ?? await getBackendGuildShopPage(params.bid, params.uid);
		return {
			code: "OK",
			data: buildGuildShopDisplay(page)
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取商店失败" }
		};
	}
}

//#endregion
export { App as default };