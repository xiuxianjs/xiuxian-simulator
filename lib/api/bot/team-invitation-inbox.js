import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/team-invitation-inbox.ts
async function refreshBackendTeamInvitations(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseBackendTeamInvitationInbox(await requestBackend(bid, "post_players_id_team_invitations_refresh", {
		path: { id: uid },
		...context
	}));
}
function parseBackendTeamInvitationInbox(value) {
	const data = value;
	const nullableText = (value) => value === null || typeof value === "string";
	if (!data?.access || typeof data.access.ok !== "boolean" || !nullableText(data.access.realmName) || !Array.isArray(data.invitations) || data.invitations.some((row) => !row || !Number.isInteger(row.id) || !Number.isInteger(row.teamId) || !nullableText(row.leaderName) || !nullableText(row.inviterName) || !nullableText(row.createdAt) || row.createdAt !== null && !Number.isFinite(new Date(row.createdAt).getTime()))) throw new Error("队伍邀请接口返回不完整");
	return data;
}

//#endregion
export { parseBackendTeamInvitationInbox, refreshBackendTeamInvitations };