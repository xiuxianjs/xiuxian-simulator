import { getBackendLearnedBooks } from "../../../api/bot/learned-books-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/skillBook/hidden/app.ts
async function getMyHiddenSkillBooks(params) {
	try {
		const result = await getBackendLearnedBooks(params.bid, params.uid, params.page, "hidden");
		return {
			code: "OK",
			data: {
				items: result.items,
				total: result.total,
				totalPages: result.totalPages,
				currentPage: result.currentPage
			}
		};
	} catch (error) {
		logger.error("查看隐藏功法失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看隐藏功法失败，请稍后再试或联系运营。" }
		};
	}
}

//#endregion
export { getMyHiddenSkillBooks };