import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/team-invitation-cancel.ts
async function cancelBackendTeamInvitation(bid, invitationId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	const data = await requestBackend(bid, "delete_teams_invitations_invitationId", {
		path: { invitationId: String(invitationId) },
		...context,
		headers: repeatPresentationHeaders(repeatCommand)
	});
	if (!data || ![
		"cancelled",
		"not_in_team",
		"not_leader",
		"not_found"
	].includes(data.outcome)) throw new Error("取消队伍邀请响应不完整");
	return data;
}

//#endregion
export { cancelBackendTeamInvitation };