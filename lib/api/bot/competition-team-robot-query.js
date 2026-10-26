import { parseCompetitionActionResult } from "./guild-competition-actions.js";

//#region src/api/bot/competition-team-robot-query.ts
function parseRobotCompetitionTeamAction(value, allowUsage = false) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门大比操作响应不完整");
	const row = value;
	if (allowUsage && row.outcome === "usage") return { outcome: "usage" };
	if (row.outcome !== "result" || typeof row.message !== "string") throw new Error("宗门大比操作响应不完整");
	return {
		outcome: "result",
		receipt: parseCompetitionActionResult(row.receipt),
		message: row.message
	};
}
const clean = (text) => text.trim().replace(/^(!|！|\/|#|＃)?\s*/, "");
function competitionRemoveArguments(text) {
	const match = clean(text).match(/^移除宗门大比成员\s+(\d+)$/);
	return { positionText: match ? String(Number(match[1])) : null };
}
function competitionAdjustArguments(text) {
	const match = clean(text).match(/^调整宗门大比位置\s+(\d+)\s+(\d+)$/);
	const number = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
	return { positions: match ? {
		fromPosition: number(match[1]),
		toPosition: number(match[2])
	} : null };
}

//#endregion
export { competitionAdjustArguments, competitionRemoveArguments, parseRobotCompetitionTeamAction };