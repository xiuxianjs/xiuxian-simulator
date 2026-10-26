import { getBackendLearnedBooks } from "../../../api/bot/learned-books-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/skillBook/mySkillBooks/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendLearnedBooks(params.bid, params.uid, params.page, "visible")
		};
	} catch (error) {
		logger.error("查看已学习功法失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看已学习功法失败，请稍后再试或联系运营。" }
		};
	}
}

//#endregion
export { App as default };