import { requestBackend } from "./client.js";

//#region src/api/bot/popularity-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("人气榜接口格式不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("人气榜接口缺少文本字段");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("人气榜接口缺少数值字段");
	return value;
}
async function getBackendPopularity(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendPopularity(await requestBackend(bid, "get_players_id_popularity_leaderboard", { path: { id: uid } }));
}
function parseBackendPopularity(value) {
	const data = record(value);
	if (typeof data.canUseFifthLayerFeature !== "boolean" || !Array.isArray(data.items)) throw new Error("人气榜接口资格或列表不完整");
	const entry = (value) => {
		const row = record(value);
		return {
			rank: number(row.rank),
			uid: number(row.uid),
			name: text(row.name),
			popularity: number(row.popularity)
		};
	};
	if (!Array.isArray(data.nearby)) throw new Error("人气榜接口缺少附近排名");
	const list = data.items.map(entry);
	return {
		canUseFifthLayerFeature: data.canUseFifthLayerFeature,
		self: data.self === null ? null : entry(data.self),
		nearby: data.nearby.map(entry),
		realmName: data.realmName === null ? "未知" : text(data.realmName),
		list
	};
}
function parseRobotPopularity(data) {
	const result = parseBackendPopularity(data);
	if (!result.canUseFifthLayerFeature) throw new Error("人气排行成功响应缺少资格");
	return result;
}

//#endregion
export { getBackendPopularity, parseBackendPopularity, parseRobotPopularity };