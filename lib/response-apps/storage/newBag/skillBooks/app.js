import { getBackendSkillBookBag } from "../../../../api/bot/queries.js";
import "../../../../api/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/storage/newBag/skillBooks/app.ts
async function App(params) {
	try {
		const result = await getBackendSkillBookBag(params.bid, params.uid, params.skillType, params.page);
		return {
			code: "OK",
			data: {
				skillType: result.skillType,
				page: result.page,
				total: result.total,
				totalPages: result.totalPages,
				items: result.items,
				capabilities: result.capabilities
			}
		};
	} catch (error) {
		logger.error("查询功法失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };