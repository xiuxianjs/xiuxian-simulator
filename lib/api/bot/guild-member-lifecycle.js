import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-member-lifecycle.ts
function parseGuildMemberMutation(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("宗门操作响应不完整");
	const row = data;
	if (typeof row.outcome !== "string" || typeof row.message !== "string" || !Number.isInteger(row.guildId) || typeof row.guildName !== "string" || typeof row.confirmationRequired !== "boolean") throw new Error("宗门操作响应不完整");
	return row;
}
function options(id, request) {
	return {
		path: { id },
		...writeContext(request)
	};
}
async function leaveBackendGuild(bid, id, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildMemberMutation(await requestBackend(bid, "post_players_id_guild_leave", {
		...options(id, request),
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
async function leaderLeaveBackendGuild(bid, id, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildMemberMutation(await requestBackend(bid, "post_players_id_guild_leader_leave", {
		...options(id, request),
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
async function kickBackendGuildMember(bid, id, targetId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildMemberMutation(await requestBackend(bid, "post_players_id_guild_kick_targetId", {
		path: {
			id,
			targetId
		},
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
async function transferBackendGuildLeadership(bid, id, index, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildLeadershipTransfer(await requestBackend(bid, "post_players_id_guild_leadership_transfer", {
		...options(id, request),
		body: { index }
	}));
}
function parseGuildLeadershipTransfer(value) {
	const data = parseGuildMemberMutation(value);
	const row = data;
	if (![
		"candidates",
		"confirmation_required",
		"transferred"
	].includes(row.outcome)) throw new Error("宗主转让响应不完整");
	if (!Array.isArray(data.candidates)) throw new Error("宗主转让候选响应不完整");
	row.candidates = data.candidates;
	for (const candidate of row.candidates) if (!candidate || typeof candidate !== "object" || Array.isArray(candidate) || !Number.isInteger(candidate.index) || typeof candidate.name !== "string" || typeof candidate.roleName !== "string" || !Number.isInteger(candidate.weeklyActivity) || !Number.isInteger(candidate.contributionTotal)) throw new Error("宗主转让候选响应不完整");
	if (row.confirmationExpiresInSeconds !== void 0 && !Number.isInteger(row.confirmationExpiresInSeconds)) throw new Error("宗主转让确认响应不完整");
	return row;
}

//#endregion
export { kickBackendGuildMember, leaderLeaveBackendGuild, leaveBackendGuild, parseGuildLeadershipTransfer, parseGuildMemberMutation, transferBackendGuildLeadership };