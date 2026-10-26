import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-milestone-claim.ts
function record(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function integer(value) {
	return typeof value === "number" && Number.isSafeInteger(value);
}
async function postBackendGuildMilestoneClaim(bid, uid, milestoneId, request, repeatCommand) {
	if (!bid) throw new Error("领取缺少平台身份");
	return parseGuildMilestoneClaim(await requestBackend(bid, "post_players_id_guild_milestones_claims_milestoneId", {
		path: {
			id: uid,
			milestoneId
		},
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}), milestoneId);
}
function parseGuildMilestoneClaim(value, milestoneId) {
	const data = record(value, "宗门里程碑领取响应不完整");
	const rewards = record(data.rewards, "宗门里程碑奖励响应不完整");
	if (typeof data.message !== "string" || !integer(data.milestoneId) || data.milestoneId !== milestoneId || data.type !== "daily_activity" && data.type !== "weekly_activity" || !integer(data.threshold) || !integer(data.currentPoints) || !integer(rewards.spiritStone) || !integer(rewards.contribution) || !integer(rewards.prestige)) throw new Error("宗门里程碑领取响应不完整");
	return data;
}
async function postBackendGuildMilestonesClaimAll(bid, uid, type, request, repeatCommand) {
	if (!bid) throw new Error("领取缺少平台身份");
	return parseGuildMilestonesClaimAll(await requestBackend(bid, "post_players_id_guild_milestones_types_type_claim_all", {
		path: {
			id: uid,
			type
		},
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
function parseGuildMilestonesClaimAll(value) {
	const data = record(value, "宗门里程碑一键领取响应不完整");
	if (typeof data.message !== "string" || typeof data.partial !== "boolean" || !Array.isArray(data.claimed)) throw new Error("宗门里程碑一键领取响应不完整");
	if (!data.claimed.map((item) => record(item, "宗门里程碑一键领取响应不完整")).every((item) => integer(item.id) && integer(item.threshold) && typeof item.description === "string")) throw new Error("宗门里程碑一键领取响应不完整");
	return data;
}

//#endregion
export { parseGuildMilestoneClaim, parseGuildMilestonesClaimAll, postBackendGuildMilestoneClaim, postBackendGuildMilestonesClaimAll };