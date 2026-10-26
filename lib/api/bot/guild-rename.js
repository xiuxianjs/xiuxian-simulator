import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-rename.ts
async function renameBackendGuild(bid, uid, name, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildRename(await requestBackend(bid, "post_players_id_guild_rename", {
		path: { id: uid },
		body: { name },
		...writeContext(request)
	}));
}
function parseGuildRename(value) {
	const data = value;
	if (!data || ![
		"renamed",
		"too_short",
		"too_long",
		"invalid_characters",
		"inappropriate",
		"name_taken",
		"not_joined",
		"permission_denied",
		"rename_card_missing",
		"rename_card_insufficient"
	].includes(data.outcome) || data.guildName !== null && typeof data.guildName !== "string") throw new Error("宗门改名响应不完整");
	return data;
}

//#endregion
export { parseGuildRename, renameBackendGuild };