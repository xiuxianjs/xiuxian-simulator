import { getBackendMarketTrades } from "../../../api/bot/queries.js";
import { PAGE_SIZE } from "../../../constants/common.js";
import "../../../constants/index.js";
import "../../../api/bot/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/market/records/app.ts
async function App(params) {
	try {
		const { rows, currentPage, totalPages, total } = await getBackendMarketTrades(params.bid, params.uid, params.mode, params.page, 5);
		return {
			code: "OK",
			data: {
				rows,
				currentPage,
				totalPages,
				total,
				title: params.mode === "buy" ? "交易记录（买）" : params.mode === "sell" ? "交易记录（卖）" : "交易记录",
				cmdPrefix: params.mode === "buy" ? "/我的交易记录 买" : params.mode === "sell" ? "/我的交易记录 卖" : "/我的交易记录"
			}
		};
	} catch (error) {
		logger.error("查看我的交易记录失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看我的交易记录失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };