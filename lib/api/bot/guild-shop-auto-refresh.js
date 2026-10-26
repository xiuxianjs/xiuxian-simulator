import { requestBackend } from "./client.js";

//#region src/api/bot/guild-shop-auto-refresh.ts
function parseGuildShopAutoRefresh(value) {
	const data = value;
	if (!data || ![
		"not_joined",
		"denied",
		"shop_missing",
		"ready",
		"updated"
	].includes(data.outcome) || typeof data.enabled !== "boolean" || typeof data.isLeader !== "boolean" || typeof data.isViceLeader !== "boolean" || typeof data.version !== "string" || !Array.isArray(data.hours) || data.hours.some((hour) => !Number.isFinite(hour) || hour < 0 || hour > 23)) throw new Error("宗门自动刷新配置响应不完整");
	return data;
}
async function getBackendGuildAutoRefresh(bid, uid, forWrite = false) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildShopAutoRefresh(forWrite ? await requestBackend(bid, "get_players_id_guild_shop_auto_refresh_write_context", { path: { id: uid } }) : await requestBackend(bid, "get_players_id_guild_shop_auto_refresh", { path: { id: uid } }));
}
async function getBackendGuildLeadership(bid, uid) {
	if (!bid) throw new Error("操作缺少平台身份");
	const data = await requestBackend(bid, "get_players_id_guild_leadership", { path: { id: uid } });
	if (!data || typeof data.isLeader !== "boolean" || typeof data.isViceLeader !== "boolean") throw new Error("宗门角色响应不完整");
	return data;
}

//#endregion
export { getBackendGuildAutoRefresh, getBackendGuildLeadership, parseGuildShopAutoRefresh };