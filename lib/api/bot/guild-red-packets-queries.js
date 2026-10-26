import { requestBackend } from "./client.js";

//#region src/api/bot/guild-red-packets-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门红包数据不完整");
	return value;
}
async function getBackendGuildRedPackets(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseGuildRedPackets(await requestBackend(bid, "get_players_id_guild_red_packets", { path: { id: uid } }));
}
function parseGuildRedPackets(value) {
	const data = record(value);
	if (typeof data.hasGuild !== "boolean" || data.guildName !== null && typeof data.guildName !== "string" || !Array.isArray(data.packets)) throw new Error("宗门红包数据不完整");
	for (const value of data.packets) {
		const row = record(value);
		if (![
			"id",
			"perAmount",
			"packetCount",
			"claimedCount",
			"remaining"
		].every((key) => Number.isSafeInteger(row[key])) || typeof row.currencyType !== "string" || typeof row.currencyName !== "string" || typeof row.remainingTimeText !== "string" || row.expiresAt !== null && (typeof row.expiresAt !== "string" || !Number.isFinite(new Date(row.expiresAt).getTime()))) throw new Error("宗门红包字段不完整");
	}
	return data;
}

//#endregion
export { getBackendGuildRedPackets, parseGuildRedPackets };