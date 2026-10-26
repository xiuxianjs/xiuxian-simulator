import { formatGameTime } from "../../../utils/gameTime.js";
import { getBackendTeamApplicationRecords } from "../../../api/bot/queries.js";
import "../../../api/bot/index.js";
import { cancelBackendTeamApplication } from "../../../api/bot/team-application-cancel.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/cancelApplication/app.ts
async function App(params) {
	try {
		if (!params.applicationId) {
			const { applications } = await getBackendTeamApplicationRecords(params.bid, params.uid);
			if (applications.length === 0) return { code: "NO_PENDING" };
			return {
				code: "LIST",
				data: { applications: applications.map((app) => ({
					id: app.id,
					leaderName: app.leaderName,
					createdAt: app.createdAt ? formatGameTime(app.createdAt) : null
				})) }
			};
		}
		const result = await cancelBackendTeamApplication(params.bid, params.applicationId, params.request, params.repeatCommand);
		if (result.outcome === "cancelled") return {
			code: "CANCEL_OK",
			data: { message: `已取消向【${result.leaderName === null || result.leaderName === "" ? "未知" : result.leaderName}】队伍的申请` }
		};
		return {
			code: "CANCEL_FAILED",
			data: { message: "申请记录不存在或已处理" }
		};
	} catch (error) {
		logger.error("取消队伍申请失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "取消申请失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };