import { getBackendInventory } from "../../../../api/bot/inventory.js";
import "../../../../api/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/storage/newBag/materials/app.ts
async function App(params) {
	try {
		if (!params.bid) throw new Error("背包请求缺少平台身份");
		const remote = await getBackendInventory(params.bid, params.uid, {
			category: "material",
			subtype: params.subcategory ?? void 0,
			page: params.page
		}, params.request);
		return {
			code: "OK",
			data: {
				activeSubcategory: remote.activeSubcategory,
				page: remote.pagination.page,
				total: remote.pagination.total,
				pageSize: remote.pagination.pageSize,
				items: remote.items,
				capabilities: remote.capabilities
			}
		};
	} catch (error) {
		logger.error("查询材料失败:", {
			requestId: params.request?.requestId,
			error
		});
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };