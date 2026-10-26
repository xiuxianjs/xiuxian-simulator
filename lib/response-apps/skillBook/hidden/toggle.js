import { setBackendSkillVisibility } from "../../../api/bot/skill-visibility.js";
import { logger } from "alemonjs";

//#region src/response-apps/skillBook/hidden/toggle.ts
async function toggleSkillBookHidden(params) {
	try {
		const result = await setBackendSkillVisibility(params.bid, params.uid, params.skillBookId, params.isHidden, params.request);
		return {
			code: result.code === "UPDATED" ? "OK" : "FAILED",
			data: { message: result.message }
		};
	} catch (error) {
		logger.error(`${params.isHidden ? "隐藏" : "显示"}功法失败:`, error);
		return {
			code: "LOAD_FAILED",
			data: { message: `${params.isHidden ? "隐藏" : "显示"}功法失败，请稍后再试或联系运营。` }
		};
	}
}

//#endregion
export { toggleSkillBookHidden };