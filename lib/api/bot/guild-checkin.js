import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-checkin.ts
async function postBackendGuildCheckin(bid, uid, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildCheckin(await requestBackend(bid, "post_players_id_guild_checkin", {
		path: { id: uid },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
function parseGuildCheckin(value) {
	const data = value;
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("宗门签到响应不完整");
	const row = data;
	if (![
		"guildId",
		"contributionAdded",
		"prestigeAdded",
		"dailyActivityAdded",
		"weeklyActivityAdded",
		"weeklyBonusSpiritStone",
		"weeklyCheckinCount"
	].every((key) => Number.isSafeInteger(row[key]))) throw new Error("宗门签到响应不完整");
	if (typeof row.message !== "string" || !row.message) throw new Error("宗门签到响应不完整");
	return row;
}

//#endregion
export { parseGuildCheckin, postBackendGuildCheckin };