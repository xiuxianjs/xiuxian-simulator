import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-upgrade.ts
async function postBackendGuildUpgrade(bid, uid, kind, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildUpgrade(await requestBackend(bid, "post_players_id_guild_upgrade", {
		path: { id: uid },
		body: { kind },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}), kind);
}
function parseGuildUpgrade(data, kind) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("宗门升级响应不完整");
	const row = data;
	if (!Number.isSafeInteger(row.guildId) || typeof row.guildName !== "string" || row.kind !== kind || !Number.isSafeInteger(row.level) || !Number.isSafeInteger(row.spiritStoneCost) || !Number.isSafeInteger(row.prestigeCost) || typeof row.message !== "string" || !row.message) throw new Error("宗门升级响应不完整");
	return row;
}

//#endregion
export { parseGuildUpgrade, postBackendGuildUpgrade };