import { requestTeamWorkflow } from "../../../api/bot/social-workflows.js";
import { MSG_TEAM } from "../../../constants/messages.js";
import { resolvePositionTarget } from "../../../utils/teamTarget.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/setPosition/app.ts
async function App(params) {
	try {
		const result = await requestTeamWorkflow(params.bid, params.uid, {
			action: "position",
			...params.selector,
			position: params.position
		}, params.request, params.repeatCommand);
		if (!("outcome" in result)) throw new Error("队伍操作响应不完整");
		if (result.outcome === "target_missing") return { code: "TARGET_MISSING" };
		if (result.outcome !== "updated") return {
			code: "LOAD_FAILED",
			data: { message: {
				invalid_position: "位置必须在1-6之间",
				not_in_team: MSG_TEAM.NOT_IN_TEAM,
				not_leader: MSG_TEAM.NOT_LEADER,
				target_not_in_team: MSG_TEAM.TARGET_NOT_IN_TEAM,
				same_position: MSG_TEAM.MEMBER_SAME_POSITION
			}[result.outcome] }
		};
		return { code: "OK" };
	} catch (error) {
		logger.error("设置队伍位置失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "设置失败" }
		};
	}
}

//#endregion
export { App as default, resolvePositionTarget };