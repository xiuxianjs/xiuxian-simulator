import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-membership-mutations.ts
function record(data, message) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(message);
	return data;
}
function integer(value, minimum = 0) {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}
async function createBackendGuild(bid, uid, name, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildCreate(await requestBackend(bid, "post_players_id_guilds", {
		path: { id: uid },
		body: { name },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
function parseGuildCreate(value) {
	const data = record(value, "创建宗门响应不完整");
	if (!integer(data.guildId, 1) || typeof data.name !== "string") throw new Error("创建宗门响应不完整");
	return {
		guildId: data.guildId,
		name: data.name
	};
}
async function applyBackendGuild(bid, uid, guildId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildApply(await requestBackend(bid, "post_players_id_guild_applications", {
		path: { id: uid },
		body: { guildId },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
function parseGuildApply(value) {
	const data = record(value, "入宗申请响应不完整");
	if (!integer(data.applicationId, 1) || !integer(data.guildId, 1) || typeof data.guildName !== "string" || typeof data.levelName !== "string" || !integer(data.memberCount)) throw new Error("入宗申请响应不完整");
	return {
		applicationId: data.applicationId,
		guildId: data.guildId,
		guildName: data.guildName,
		levelName: data.levelName,
		memberCount: data.memberCount
	};
}
async function decideBackendGuildApplication(bid, uid, targetUid, approve, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const requestOptions = {
		path: {
			id: uid,
			targetId: targetUid
		},
		...writeContext(request),
		headers: approve ? repeatPresentationHeaders(repeatCommand) : void 0
	};
	return parseGuildApplicationDecision(approve ? await requestBackend(bid, "post_players_id_guild_applications_users_targetId_approve", requestOptions) : await requestBackend(bid, "post_players_id_guild_applications_users_targetId_reject", requestOptions));
}
function parseGuildApplicationDecision(response) {
	const data = record(response, "宗门审核响应不完整");
	if (typeof data.outcome !== "string" || ![
		"approved",
		"rejected",
		"auto_rejected"
	].includes(data.outcome) || !integer(data.applicationId, 1) || !integer(data.guildId, 1) || !integer(data.applicantId, 1) || typeof data.applicantName !== "string" || typeof data.message !== "string") throw new Error("宗门审核响应不完整");
	return {
		outcome: data.outcome,
		applicationId: data.applicationId,
		guildId: data.guildId,
		applicantId: data.applicantId,
		applicantName: data.applicantName,
		message: data.message
	};
}

//#endregion
export { applyBackendGuild, createBackendGuild, decideBackendGuildApplication, parseGuildApplicationDecision, parseGuildApply, parseGuildCreate };