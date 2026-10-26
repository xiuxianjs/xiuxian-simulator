import { getBackendProfessionToolBag } from "../../../../api/bot/queries.js";
import "../../../../api/bot/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/storage/newBag/tiangong/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendProfessionToolBag(params.bid, params.uid, params.equipmentType ?? void 0, params.page)
		};
	} catch (error) {
		logger.error("查询天工工具失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };