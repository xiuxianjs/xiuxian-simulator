import { requestBackend } from "./client.js";

//#region src/api/bot/cave-queries.ts
function count(value, minimum = 0) {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}
async function getBackendCaveLogs(bid, uid, page = 1) {
	if (!bid?.trim()) throw new Error("查询缺少平台身份");
	if (!Number.isSafeInteger(uid) || uid <= 0) throw new Error("洞府记录查询参数无效");
	return parseBackendCaveLogs(await requestBackend(bid, "get_players_id_cave_logs", {
		path: { id: uid },
		query: {
			page: Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.floor(page) || 1)),
			pageSize: 5
		}
	}));
}
function parseBackendCaveLogs(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("洞府记录接口返回格式不完整");
	const row = data;
	if (row.realmName !== null && typeof row.realmName !== "string" || typeof row.canUseCave !== "boolean" || typeof row.lockedMessage !== "string" || typeof row.hasCavePlot !== "boolean" || !Array.isArray(row.logs) || !row.logs.every((value) => typeof value === "string") || !count(row.page, 1) || !count(row.total) || !count(row.totalPages, 1) || row.page > row.totalPages || row.nextCursor !== void 0 && typeof row.nextCursor !== "string") throw new Error("洞府记录接口返回格式不完整");
	return {
		realmName: row.realmName,
		canUseCave: row.canUseCave,
		lockedMessage: row.lockedMessage,
		hasCavePlot: row.hasCavePlot,
		logs: [...row.logs],
		page: row.page,
		total: row.total,
		totalPages: row.totalPages,
		...typeof row.nextCursor === "string" ? { nextCursor: row.nextCursor } : {}
	};
}

//#endregion
export { getBackendCaveLogs, parseBackendCaveLogs };