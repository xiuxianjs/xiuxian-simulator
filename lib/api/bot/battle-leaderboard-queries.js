import { exactInteger } from "../core/exact-json.js";
import { requestBackend } from "./client.js";

//#region src/api/bot/battle-leaderboard-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("战力排行接口数据不完整");
	return value;
}
function finite(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("战力排行接口数据不完整");
	return value;
}
function textOrNull(value) {
	if (value === null) return null;
	if (typeof value !== "string") throw new Error("战力排行接口数据不完整");
	return value;
}
function entry(value) {
	const row = record(value);
	const name = row.name;
	if (name !== void 0 && typeof name !== "string") throw new Error("战力排行接口数据不完整");
	return {
		rank: finite(row.rank),
		uid: finite(row.uid),
		...name === void 0 ? {} : { name },
		power: exactInteger(row.power)
	};
}
async function getBackendBattleLeaderboard(bid, uid, page, regional = false) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendBattleLeaderboard(await requestBackend(bid, regional ? "get_players_id_leaderboards_battle_region" : "get_players_id_leaderboards_battle", {
		path: { id: uid },
		query: { page }
	}));
}
function parseBackendBattleLeaderboard(value) {
	const result = record(value);
	const access = record(result.access);
	if (typeof access.ok !== "boolean" || typeof access.canUseSpar !== "boolean") throw new Error("战力排行接口缺少资格");
	const output = {
		access: {
			ok: access.ok,
			canUseSpar: access.canUseSpar,
			realmName: textOrNull(access.realmName),
			region: textOrNull(access.region)
		},
		leaderboard: null
	};
	if (!output.access.ok) {
		if (result.leaderboard !== null) throw new Error("战力排行资格与榜单不一致");
		return output;
	}
	const board = record(result.leaderboard);
	if (!Array.isArray(board.list) || !Array.isArray(board.nearby) || typeof board.building !== "boolean" || typeof board.complete !== "boolean") throw new Error("战力排行接口缺少榜单");
	output.leaderboard = {
		page: finite(board.page),
		totalPages: finite(board.totalPages),
		total: finite(board.total),
		time: board.time === null ? null : finite(board.time),
		list: board.list.map(entry),
		nearby: board.nearby.map(entry),
		self: board.self === null ? null : entry(board.self),
		building: board.building,
		complete: board.complete
	};
	return output;
}
function parseRobotBattleLeaderboard(value) {
	const result = parseBackendBattleLeaderboard(value);
	if (!result.access.ok || !result.leaderboard) throw new Error("战力排行成功响应缺少榜单");
	return {
		...result.leaderboard,
		canUseSpar: result.access.canUseSpar
	};
}

//#endregion
export { getBackendBattleLeaderboard, parseBackendBattleLeaderboard, parseRobotBattleLeaderboard };