import { requestBackend } from "./client.js";

//#region src/api/bot/tianjiao-leaderboard-queries.ts
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
async function getBackendTianjiaoLeaderboard(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseTianjiaoLeaderboard(await requestBackend(bid, "get_players_id_tianjiao", { path: { id: uid } }));
}
function parseTianjiaoLeaderboard(data) {
	if (!record(data) || typeof data.isVisible !== "boolean" || typeof data.canChallenge !== "boolean" || typeof data.lockedMessage !== "string" || typeof data.requiredText !== "string" || data.suggestedTarget !== null && (typeof data.suggestedTarget !== "number" || !Number.isSafeInteger(data.suggestedTarget)) || typeof data.requiredRealmName !== "string" || typeof data.stageName !== "string" || typeof data.stageLevel !== "number" || !Number.isSafeInteger(data.stageLevel) || typeof data.attemptsLeft !== "number" || !Number.isFinite(data.attemptsLeft) || data.myRank !== null && (typeof data.myRank !== "number" || !Number.isSafeInteger(data.myRank)) || !Array.isArray(data.entries)) throw new Error("登天梯榜单接口数据不完整");
	for (const entry of data.entries) if (!record(entry) || typeof entry.rank !== "number" || !Number.isSafeInteger(entry.rank) || typeof entry.occupied !== "boolean" || typeof entry.userName !== "string" || typeof entry.realmName !== "string" || typeof entry.power !== "number" || !Number.isSafeInteger(entry.power) || typeof entry.isMe !== "boolean" || entry.userId !== void 0 && (typeof entry.userId !== "number" || !Number.isSafeInteger(entry.userId))) throw new Error("登天梯榜单条目不完整");
	return data;
}

//#endregion
export { getBackendTianjiaoLeaderboard, parseTianjiaoLeaderboard };