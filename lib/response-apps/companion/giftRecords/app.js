import { getBackendGiftRecords } from "../../../api/bot/queries.js";
import "../../../api/index.js";
import { PAGE_SIZE } from "../../../constants/common.js";
import "../../../constants/index.js";
import { presentGiftRecords } from "../../../utils/giftRecordPresentation.js";
import { logger } from "alemonjs";

//#region src/response-apps/companion/giftRecords/app.ts
async function App(params) {
	try {
		const pageSize = 5;
		const data = await getBackendGiftRecords(params.bid, params.uid, params.mode, params.page, pageSize);
		return {
			code: "OK",
			data: presentGiftRecords(data, params.mode)
		};
	} catch (error) {
		logger.error("查看赠礼记录失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看赠礼记录失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };