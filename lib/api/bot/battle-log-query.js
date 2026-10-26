import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend } from "./client.js";

//#region src/api/bot/battle-log-query.ts
/** The existing GET remains read-only; this query opts into presentation writes. */
async function queryBackendBattleLog(bid, uid, logId, repeatCommand) {
	if (!bid?.trim()) throw new Error("查询缺少平台身份");
	if (!Number.isSafeInteger(uid) || uid <= 0 || typeof logId !== "string" || logId.length === 0) throw new Error("战斗日志查询参数无效");
	return parseBackendBattleLog(await requestBackend(bid, "post_players_id_battle_log_query", {
		path: { id: uid },
		body: { logId },
		headers: repeatPresentationHeaders(repeatCommand)
	}), logId);
}
function parseBackendBattleLog(data, logId) {
	if (typeof data !== "object" || data === null || Array.isArray(data) || !("logId" in data) || data.logId !== logId || !("text" in data) || !("readFailed" in data) || data.text !== null && typeof data.text !== "string" || typeof data.readFailed !== "boolean" || data.readFailed && data.text !== null) throw new Error("战斗日志响应不完整");
	const share = "memoryShare" in data ? data.memoryShare : void 0;
	const memoryShare = share && typeof share === "object" && "token" in share && typeof share.token === "string" && "expiresAt" in share && typeof share.expiresAt === "string" ? {
		token: share.token,
		expiresAt: share.expiresAt
	} : void 0;
	return {
		logId: data.logId,
		text: data.text,
		readFailed: data.readFailed,
		...memoryShare ? { memoryShare } : {}
	};
}
function parseRobotBattleLog(data, logId) {
	const result = parseBackendBattleLog(data, logId);
	if (result.readFailed || !result.text && !result.memoryShare) throw new Error("战斗日志成功响应不完整");
	return result;
}

//#endregion
export { parseBackendBattleLog, parseRobotBattleLog, queryBackendBattleLog };