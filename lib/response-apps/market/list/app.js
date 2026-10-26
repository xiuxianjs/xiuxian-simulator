import { getBackendMarketBrowse } from "../../../api/bot/market-browse-query.js";
import { logger } from "alemonjs";

//#region src/response-apps/market/list/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendMarketBrowse(params.bid, params.uid, {
				categoryType: params.categoryKey?.type,
				categorySubtype: params.categoryKey?.subtype,
				keyword: params.keyword,
				sort: params.sort,
				page: params.page
			}, params.request)
		};
	} catch (error) {
		logger.error("查看珍宝楼失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看珍宝楼失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };