import { parseGameTime } from "../../../utils/gameTime.js";
import { validateBackendAchievements } from "../../../api/bot/queries.js";
import { runRobotBusiness } from "../../../response/robotBusiness.js";
import { validateGuardedAchievement } from "../../../api/bot/achievement-robot-query.js";
import { logger } from "alemonjs";

//#region src/response-apps/achievements/myAchievements/app.ts
async function App(params) {
	try {
		const response = await runRobotBusiness(params.event, "achievements.completed", {
			page: params.page,
			pageSize: params.pageSize
		}, (value) => validateGuardedAchievement(value, (value) => validateBackendAchievements(value, true)), params.next);
		if (response.handled) return;
		if (response.data.locked) return {
			code: "LOCKED",
			data: { realmName: response.data.realmName }
		};
		const result = response.data.data;
		return {
			code: "OK",
			data: {
				items: result.achievements.map((userAchievement) => {
					const achievement = userAchievement;
					return {
						name: achievement.name ?? "未知成就",
						description: achievement.description ?? "暂无描述",
						completedAt: parseGameTime(userAchievement.completedAt)?.toISOString() ?? null
					};
				}),
				page: {
					currentPage: result.currentPage,
					totalPages: result.totalPages,
					total: result.total
				}
			}
		};
	} catch (error) {
		logger.error("查询我的成就失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };