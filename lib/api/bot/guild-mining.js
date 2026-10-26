import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-mining.ts
async function postBackendGuildMining(bid, uid, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildMining(await requestBackend(bid, "post_players_id_guild_mining", {
		path: { id: uid },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
function parseGuildMining(value) {
	const data = value;
	if (!data || ![
		"started",
		"in_progress",
		"settled"
	].includes(data.outcome) || typeof data.message !== "string" || typeof data.guildName !== "string" || typeof data.started !== "boolean" || typeof data.capReached !== "boolean" || ![
		data.guildId,
		data.veinLevel,
		data.miningQuota,
		data.remainingSeconds,
		data.settledHours,
		data.spiritStoneAdded,
		data.contributionAdded,
		data.dailyActivityAdded
	].every(Number.isSafeInteger)) throw new Error("宗门采矿响应不完整");
	return data;
}

//#endregion
export { parseGuildMining, postBackendGuildMining };