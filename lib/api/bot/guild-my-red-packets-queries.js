import { requestBackend } from "./client.js";

//#region src/api/bot/guild-my-red-packets-queries.ts
async function getBackendGuildMyRedPackets(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseGuildMyRedPackets(await requestBackend(bid, "get_players_id_guild_red_packets_mine", { path: { id: uid } }));
}
function parseGuildMyRedPackets(data) {
	const value = data;
	if (!value || typeof value.hasGuild !== "boolean" || value.guildName !== null && typeof value.guildName !== "string" || !Array.isArray(value.packets) || value.packets.some((p) => !p || ![
		p.id,
		p.packetCount,
		p.perAmount,
		p.status,
		p.claimedCount,
		p.recycled,
		p.recycleAmount
	].every(Number.isSafeInteger) || typeof p.currencyType !== "string" || typeof p.currencyName !== "string" || typeof p.statusText !== "string" || typeof p.canRecycle !== "boolean" || p.expiresAt !== null && (typeof p.expiresAt !== "string" || !Number.isFinite(new Date(p.expiresAt).getTime())))) throw new Error("红包接口数据不完整");
	return value;
}

//#endregion
export { getBackendGuildMyRedPackets, parseGuildMyRedPackets };