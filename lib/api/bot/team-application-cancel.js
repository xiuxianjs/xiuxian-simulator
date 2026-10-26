import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/team-application-cancel.ts
async function cancelBackendTeamApplication(bid, applicationId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	const data = await requestBackend(bid, "delete_teams_applications_applicationId", {
		path: { applicationId },
		...context,
		headers: repeatPresentationHeaders(repeatCommand)
	});
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("取消申请接口响应不完整");
	const row = data;
	if (row.outcome !== "cancelled" && row.outcome !== "not_pending" || row.leaderName !== null && typeof row.leaderName !== "string" || row.outcome === "not_pending" && row.leaderName !== null) throw new Error("取消申请接口响应不完整");
	return data;
}

//#endregion
export { cancelBackendTeamApplication };