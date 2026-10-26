import { requestBackend } from "./client.js";

//#region src/api/bot/cave-nearby-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("附近灵田接口返回格式不完整");
	return value;
}
function parseBackendCaveNearby(value) {
	const data = record(value);
	if (!Array.isArray(data.players) || data.message !== void 0 && data.message !== null && typeof data.message !== "string") throw new Error("附近灵田接口缺少列表");
	const players = data.players.map((value) => {
		const row = record(value);
		if (!Number.isSafeInteger(row.ownerId) || row.relation !== "self" && row.relation !== "companion" && row.relation !== "friend" && row.relation !== "stranger" || typeof row.ownerName !== "string" || typeof row.relationLabel !== "string" || typeof row.auraText !== "string" || typeof row.stolenStatusText !== "string" || typeof row.canSteal !== "boolean") throw new Error("附近灵田接口玩家资料不完整");
		return {
			ownerId: row.ownerId,
			ownerName: row.ownerName,
			relation: row.relation,
			relationLabel: row.relationLabel,
			auraText: row.auraText,
			stolenStatusText: row.stolenStatusText,
			canSteal: row.canSteal
		};
	});
	if (players.length > 10) throw new Error("附近灵田接口候选数量无效");
	return {
		players,
		message: data.message
	};
}
async function getBackendCaveNearby(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendCaveNearby(await requestBackend(bid, "get_players_id_cave_nearby", { path: { id: uid } }));
}

//#endregion
export { getBackendCaveNearby, parseBackendCaveNearby };