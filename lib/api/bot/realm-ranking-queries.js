import { exactInteger } from "../core/exact-json.js";
import { requestBackend } from "./client.js";
import { number, record, text } from "../schemas/ranking-values.js";

//#region src/api/bot/realm-ranking-queries.ts
async function getBackendRealmRanking(bid, uid, regional = false) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendRealmRanking(await requestBackend(bid, regional ? "get_players_id_realm_region_leaderboard" : "get_players_id_realm_leaderboard", { path: { id: uid } }));
}
function parseBackendRealmRanking(data) {
	const result = record(data);
	if (typeof result.canUseFifthLayerFeature !== "boolean" || typeof result.canUseSpar !== "boolean") throw new Error("查询接口缺少境界资格");
	if (!Array.isArray(result.list)) throw new Error("查询接口缺少列表");
	const entry = (value) => {
		const row = record(value);
		return {
			rank: number(row.rank),
			uid: number(row.uid),
			name: text(row.name),
			realmName: text(row.realmName),
			realmLevel: number(row.realmLevel),
			experience: exactInteger(row.experience)
		};
	};
	if (!Array.isArray(result.nearby)) throw new Error("查询接口缺少附近排名");
	return {
		canUseFifthLayerFeature: result.canUseFifthLayerFeature,
		canUseSpar: result.canUseSpar,
		realmName: result.realmName === null ? null : text(result.realmName),
		region: result.region === null ? null : text(result.region),
		list: result.list.map(entry),
		self: result.self === null ? null : entry(result.self),
		nearby: result.nearby.map(entry)
	};
}
function parseRobotRealmRanking(data) {
	const result = parseBackendRealmRanking(data);
	if (!result.canUseFifthLayerFeature) throw new Error("境界排行成功响应缺少资格");
	return result;
}
function parseRobotRegionalRealmRanking(data) {
	const result = parseRobotRealmRanking(data);
	if (!result.region) throw new Error("区境界排行成功响应缺少归属区");
	return result;
}

//#endregion
export { getBackendRealmRanking, parseBackendRealmRanking, parseRobotRealmRanking, parseRobotRegionalRealmRanking };