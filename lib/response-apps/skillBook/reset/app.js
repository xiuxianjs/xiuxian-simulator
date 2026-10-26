import { cancelBackendSkillBookReset, confirmBackendSkillBookReset, previewBackendSkillBookReset } from "../../../api/bot/skill-book-reset-reroll.js";
import { logger } from "alemonjs";

//#region src/response-apps/skillBook/reset/app.ts
const previewApp = async (params) => {
	try {
		return await previewBackendSkillBookReset(params.bid, params.uid, params.skillBookId, params.request);
	} catch (error) {
		logger.error("[功法重制预览] 错误:", error);
		return {
			success: false,
			message: "功法重制失败，请稍后再试"
		};
	}
};
const confirmApp = async (params) => {
	try {
		return await confirmBackendSkillBookReset(params.bid, params.uid, params.skillBookId, params.request);
	} catch (error) {
		logger.error("[功法重制确认] 错误:", error);
		return {
			success: false,
			message: "确认功法重制失败，请稍后再试"
		};
	}
};
const cancelApp = async (params) => {
	try {
		return await cancelBackendSkillBookReset(params.bid, params.uid, params.request);
	} catch (error) {
		logger.error("[功法重制取消] 错误:", error);
		return {
			success: false,
			message: "取消功法重制失败，请稍后再试"
		};
	}
};

//#endregion
export { cancelApp, confirmApp, previewApp };