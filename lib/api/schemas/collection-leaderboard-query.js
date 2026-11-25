import { number, record, text } from "./ranking-values.js";

//#region src/api/schemas/collection-leaderboard-query.ts
function parseEntry(value) {
	const row = record(value);
	const rank = number(row.rank);
	const playerId = number(row.playerId);
	const level = number(row.level);
	const exp = number(row.exp);
	const unlocked = number(row.unlocked);
	const score = number(row.score ?? 0);
	const progress = number(row.progress ?? 0);
	const hidden = row.hidden === true;
	const balance = row.balance === void 0 ? void 0 : text(row.balance);
	if (balance !== void 0 && !/^[1-9]\d{0,18}$/u.test(balance) || hidden && (playerId !== 0 || balance !== void 0)) throw new Error("排行榜余额无效");
	if (rank < 1 || !hidden && playerId < 1 || level < 0 || exp < 0 || unlocked < 0 || score < 0 || progress < 0) throw new Error("排行榜条目无效");
	return {
		rank,
		playerId,
		name: text(row.name),
		level,
		exp,
		unlocked,
		score,
		progress,
		balance,
		hidden
	};
}
function parseCollectionLeaderboard(value) {
	const result = record(value);
	if (!Array.isArray(result.items) || result.items.length > 10) throw new Error("排行榜列表无效");
	const page = number(result.page);
	const total = number(result.total);
	const totalPages = number(result.totalPages);
	if (page < 1 || page > totalPages || totalPages > 5 || total < 0 || total > 50) throw new Error("排行榜分页无效");
	return {
		items: result.items.map(parseEntry),
		self: result.self === null ? null : parseEntry(result.self),
		scope: result.scope === void 0 ? "" : text(result.scope),
		battlefield: result.battlefield === void 0 ? void 0 : number(result.battlefield),
		page,
		total,
		totalPages
	};
}

//#endregion
export { parseCollectionLeaderboard };