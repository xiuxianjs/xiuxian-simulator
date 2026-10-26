import { requestBackend } from "./client.js";

//#region src/api/bot/alchemy-ranking-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("丹师排行接口数据不完整");
	return value;
}
function integer(value) {
	return typeof value === "number" && Number.isSafeInteger(value);
}
async function getBackendAlchemyRanking(bid, uid, page, pageSize) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseAlchemyRanking(await requestBackend(bid, "get_players_id_alchemy_leaderboard", {
		path: { id: uid },
		query: {
			page,
			pageSize
		}
	}));
}
function parseAlchemyRanking(data) {
	const result = record(data);
	const access = record(result.access);
	if (typeof access.canAccess !== "boolean" || access.realmName !== null && typeof access.realmName !== "string" || !Array.isArray(result.items) || !Array.isArray(result.nearby) || !Number.isSafeInteger(result.page) || Number(result.page) < 1 || !Number.isSafeInteger(result.totalPages) || Number(result.totalPages) < 1 || Number(result.page) > Number(result.totalPages) || !Number.isSafeInteger(result.pageSize) || Number(result.pageSize) < 1 || !Number.isSafeInteger(result.total) || Number(result.total) < 0) throw new Error("丹师排行接口数据不完整");
	for (const value of [
		...result.items,
		...result.nearby,
		...result.self === null ? [] : [result.self]
	]) {
		const row = record(value);
		if (![
			"rank",
			"playerId",
			"level",
			"exp",
			"totalCrafts",
			"successCount"
		].every((key) => integer(row[key])) || ![
			"name",
			"title",
			"successRate"
		].every((key) => typeof row[key] === "string") || typeof row.canLike !== "boolean") throw new Error("丹师排行接口数据不完整");
	}
	return result;
}

//#endregion
export { getBackendAlchemyRanking, parseAlchemyRanking };