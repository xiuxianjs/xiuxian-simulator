import { requestBackend } from "./client.js";

//#region src/api/bot/competition-bets-query.ts
const record = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const integer = (value) => typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
const date = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
const month = (value) => typeof value === "string" && /^\d{4}(?:0[1-9]|1[0-2])$/.test(value);
async function getBackendCurrentMonthBets(bid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseCompetitionBets(await requestBackend(bid, "get_guild_competitions_current_month_bets_mine"));
}
function parseCompetitionBets(data) {
	const invalid = () => /* @__PURE__ */ new Error("宗门押注记录接口数据不完整");
	if (!record(data) || !month(data.anchorCompetitionId) || typeof data.materialized !== "boolean" || typeof data.readReady !== "boolean" || !Array.isArray(data.bets) || !integer(data.total) || data.total < 0 || data.total !== data.bets.length) throw invalid();
	if (!data.materialized) {
		if (data.readReady || data.season !== null || data.bets.length !== 0) throw invalid();
	} else {
		if (!data.readReady || !record(data.season) || data.season.competitionId !== data.anchorCompetitionId || !integer(data.season.status)) throw invalid();
		for (const key of [
			"registrationStartTime",
			"registrationEndTime",
			"knockoutEndTime",
			"bettingStartTime",
			"bettingEndTime",
			"settlementTime"
		]) if (!date(data.season[key])) throw invalid();
	}
	let previousId = 0;
	for (const bet of data.bets) {
		if (!record(bet) || !integer(bet.id) || bet.id <= previousId || !integer(bet.guildId) || !integer(bet.betAmount) || typeof bet.odds !== "number" || !Number.isFinite(bet.odds) || !integer(bet.winAmount) || !integer(bet.status) || !date(bet.createdAt)) throw invalid();
		previousId = bet.id;
	}
	return data;
}

//#endregion
export { getBackendCurrentMonthBets, parseCompetitionBets };