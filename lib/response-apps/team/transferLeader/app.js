import { requestTeamWorkflow } from "../../../api/bot/social-workflows.js";
import { MSG_TEAM } from "../../../constants/messages.js";
import { resolveTransferTarget } from "../../../utils/teamTarget.js";
import { logger } from "alemonjs";

//#region src/response-apps/team/transferLeader/app.ts
/**
* 转让队长
* @param params.uid 队长uid
* @param params.targetUid 目标成员uid
*/
async function App(params) {
	try {
		const result = await requestTeamWorkflow(params.bid, params.uid, {
			action: "leadership",
			...params.selector
		}, params.request, params.repeatCommand);
		if (!("outcome" in result)) throw new Error("队伍操作响应不完整");
		if (result.outcome === "target_missing") return { code: "TARGET_MISSING" };
		if (result.outcome !== "transferred") return {
			code: "LOAD_FAILED",
			data: { message: {
				self: MSG_TEAM.CANNOT_TRANSFER_SELF,
				not_in_team: MSG_TEAM.NOT_IN_TEAM,
				not_leader: MSG_TEAM.NOT_LEADER,
				target_not_in_team: MSG_TEAM.TARGET_NOT_IN_TEAM
			}[result.outcome] }
		};
		return { code: "OK" };
	} catch (error) {
		if (!(error instanceof Error)) logger.error("转让队长失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "操作失败" }
		};
	}
}

//#endregion
export { App as default, resolveTransferTarget };