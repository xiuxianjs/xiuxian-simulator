import { validateBackendAchievements } from "../../../api/bot/queries.js";
import { runRobotBusiness } from "../../../response/robotBusiness.js";
import { logger } from "alemonjs";

//#region src/response-apps/achievements/allAchievements/app.ts
async function App(params) {
	try {
		const response = await runRobotBusiness(params.event, "achievements.all", {
			page: params.page,
			pageSize: params.pageSize
		}, (value) => validateBackendAchievements(value, false), params.next);
		if (response.handled) return;
		const result = response.data;
		return {
			code: "OK",
			data: {
				items: result.achievements.map((achievement) => {
					if (achievement.displayIndex === null) throw new Error("所有成就缺少服务端序号");
					return {
						id: achievement.id,
						name: achievement.name,
						description: achievement.description,
						displayIndex: achievement.displayIndex
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
		logger.error("查询所有成就失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };