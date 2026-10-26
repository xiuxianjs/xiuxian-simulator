import { requestGuildWorkflow } from "../../../api/bot/guild-workflow.js";

//#region src/response-apps/guild/refresh/app.ts
async function App(params) {
	try {
		const result = await requestGuildWorkflow(params.bid, params.uid, { action: "shop_refresh" }, params.request, params.repeatCommand);
		return {
			code: "OK",
			data: {
				cost: result.receipt.cost,
				remainingRefreshCount: result.receipt.remaining,
				items: [],
				page: result.page,
				pageError: result.pageError
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "刷新商店失败" }
		};
	}
}

//#endregion
export { App as default };