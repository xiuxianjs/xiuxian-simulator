import { runRobotBusiness } from "../../../response/robotBusiness.js";
import { validateBackendAchievementOverview } from "../../../api/bot/achievement-overview-query.js";
import { logger } from "alemonjs";

//#region src/response-apps/achievements/overview/app.ts
async function App(params) {
	try {
		const response = await runRobotBusiness(params.event, "achievements.overview", {}, validateBackendAchievementOverview, params.next);
		if (response.handled) return;
		const data = response.data;
		return {
			code: "OK",
			data: {
				access: data.access,
				summary: data.summary,
				categories: data.categories,
				totalClaimable: data.totalClaimable,
				canClaimAll: data.canClaimAll
			}
		};
	} catch (error) {
		logger.error("查询成就总览失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };