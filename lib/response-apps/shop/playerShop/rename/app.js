import { renameBackendPlayerShop } from "../../../../api/bot/player-shop-rename.js";
import { logger } from "alemonjs";

//#region src/response-apps/shop/playerShop/rename/app.ts
async function App(params) {
	try {
		const res = await renameBackendPlayerShop(params.bid, params.uid, params.newName, params.request, params.messageText);
		return {
			code: "OK",
			data: { message: res.outcome === "renamed" ? `店铺已更名为「${res.name}」` : {
				empty: "店铺名称不能为空",
				too_short: "店铺名称至少2个字",
				too_long: "店铺名称最多12个字",
				invalid_characters: "店铺名称不能包含特殊字符",
				name_taken: "该店名已被使用，请换一个"
			}[res.outcome] }
		};
	} catch (error) {
		logger.error("命名店铺失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "命名失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };