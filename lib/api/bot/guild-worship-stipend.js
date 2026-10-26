import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-worship-stipend.ts
function settlement(data, keys, message, multipliers = []) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(message);
	const row = data;
	if (!keys.every((key) => Number.isSafeInteger(row[key])) || !multipliers.every((key) => typeof row[key] === "number" && Number.isFinite(row[key]))) throw new Error(message);
	return row;
}
async function postBackendGuildWorship(bid, uid, offer, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildWorship(await requestBackend(bid, "post_players_id_guild_worship", {
		path: { id: uid },
		body: { offer },
		...writeContext(request)
	}));
}
function parseGuildWorship(value) {
	const row = settlement(value, [
		"guildId",
		"cost",
		"dailyActivityAdded",
		"currentDailyActivity",
		"contributionAdded"
	], "祭祀祖师响应不完整");
	if (![
		"灵石",
		"灵晶",
		"道晶"
	].includes(row.offer)) throw new Error("祭祀祖师响应不完整");
	if (![
		row.message,
		row.offerText,
		row.dailyActivityText,
		row.contributionText
	].every((value) => typeof value === "string" && value.length > 0)) throw new Error("祭祀祖师响应不完整");
	return row;
}
async function postBackendGuildStipendClaim(bid, uid, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildStipend(await requestBackend(bid, "post_players_id_guild_stipend_claim", {
		path: { id: uid },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
function parseGuildStipend(value) {
	return settlement(value, [
		"guildId",
		"amount",
		"weeklyActivity",
		"guildLevel",
		"baseAmount"
	], "宗门俸禄响应不完整", ["levelMultiplier", "activityMultiplier"]);
}

//#endregion
export { parseGuildStipend, parseGuildWorship, postBackendGuildStipendClaim, postBackendGuildWorship };