import { parseCompetitionActionResult } from "./guild-competition-actions.js";

//#region src/api/bot/competition-bets-robot-query.ts
function parseRobotCompetitionBet(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门大比押注响应不完整");
	const row = value;
	if (row.outcome === "choices" || row.outcome === "usage") return { outcome: row.outcome };
	if (row.outcome !== "result" || typeof row.message !== "string") throw new Error("宗门大比押注响应不完整");
	return {
		outcome: "result",
		receipt: parseCompetitionActionResult(row.receipt),
		message: row.message
	};
}
function competitionBetArguments(text, follow = false) {
	const clean = text.trim().replace(/^(!|！|\/|#|＃)?\s*/, "");
	const full = clean.match(follow ? /^追投宗门大比\s+(\d+)$/ : /^押注宗门大比\s+(\d+)\s+(\d+)$/);
	const choice = follow ? clean === "追投宗门大比" : clean.match(/^押注宗门大比\s+(\d+)$/);
	const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
	return {
		mode: full ? "bet" : choice ? "choices" : "usage",
		guildId: !follow && full ? numeric(full[1]) : null,
		amount: full ? numeric(full[follow ? 1 : 2]) : null
	};
}

//#endregion
export { competitionBetArguments, parseRobotCompetitionBet };