import { cancelBackendSkillBookReroll, confirmBackendSkillBookReroll, previewBackendSkillBookReroll } from "../../../api/bot/skill-book-reset-reroll.js";
import { logger } from "alemonjs";

//#region src/response-apps/skillBook/reroll/app.ts
const previewApp = async (params) => {
	try {
		return await previewBackendSkillBookReroll(params.bid, params.uid, params.skillBookId, params.attrLabel, params.request);
	} catch (error) {
		logger.error("[功法换词预览] 错误:", error);
		return {
			success: false,
			message: "功法换词失败，请稍后再试"
		};
	}
};
const confirmApp = async (params) => {
	try {
		return await confirmBackendSkillBookReroll(params.bid, params.uid, params.skillBookId, params.request);
	} catch (error) {
		logger.error("[功法换词确认] 错误:", error);
		return {
			success: false,
			message: "确认功法换词失败，请稍后再试"
		};
	}
};
const cancelApp = async (params) => {
	try {
		return await cancelBackendSkillBookReroll(params.bid, params.uid, params.request);
	} catch (error) {
		logger.error("[功法换词取消] 错误:", error);
		return {
			success: false,
			message: "取消功法换词失败，请稍后再试"
		};
	}
};

//#endregion
export { cancelApp, confirmApp, previewApp };