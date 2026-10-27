import { displayCurrencyText } from "../../../constants/currency.js";
import { validateBackendAchievementCategoryProjection } from "../../../api/bot/achievement-category-projection.js";
import { runRobotBusiness } from "../../../response/robotBusiness.js";
import { logger } from "alemonjs";

//#region src/response-apps/achievements/category/app.ts
async function App(params) {
	try {
		const result = await runRobotBusiness(params.event, "achievements.category", { keyword: params.keyword }, validateBackendAchievementCategoryProjection, params.next);
		if (result.handled) return;
		const data = result.data;
		if (!data.validCategory && data.access.canUseFifthLayerFeature) return { code: "INVALID_CATEGORY" };
		return {
			code: "OK",
			data: {
				...data,
				items: data.items.map((item) => ({
					...item,
					rewardText: displayCurrencyText(item.rewardText)
				}))
			}
		};
	} catch (error) {
		logger.error("查询成就分类失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };