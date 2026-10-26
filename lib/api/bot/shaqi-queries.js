import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/shaqi-queries.ts
function identity(bid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return bid;
}
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("煞气查询接口数据不完整");
	return value;
}
function numeric(value) {
	return typeof value === "number" && Number.isFinite(value);
}
function parseBackendShaQi(value) {
	if (value === null) return null;
	const row = record(value);
	if (!numeric(row.shaQi) || !numeric(row.killGodThreshold) || !numeric(row.dailyDecayAmount) || !numeric(row.jinpenReduceAmount) || typeof row.onKillGodList !== "boolean") throw new Error("煞气查询接口数据不完整");
	return row;
}
async function getBackendShaQi(bid, uid) {
	return parseBackendShaQi(await requestBackend(identity(bid), "get_players_id_sha_qi", { path: { id: uid } }));
}
async function getBackendKillGodRanking(bid, uid) {
	return parseBackendKillGodRanking(await requestBackend(identity(bid), "get_players_id_kill_god_ranking", { path: { id: uid } }));
}
function parseBackendKillGodRanking(value) {
	const data = record(value);
	parseBackendShaQi(data.shaQiInfo);
	if (!Array.isArray(data.list) || ![
		"robberyRemaining",
		"robberyDailyMax",
		"streak",
		"streakBonusPercent",
		"killGodThreshold"
	].every((key) => numeric(data[key])) || typeof data.streakText !== "string" || typeof data.rankingRuleText !== "string" || typeof data.hasKillGodTitle !== "boolean" || typeof data.canClaimTitle !== "boolean") throw new Error("煞气查询接口数据不完整");
	for (const value of data.list) {
		const row = record(value);
		if (![
			"rank",
			"uid",
			"shaQi"
		].every((key) => numeric(row[key])) || typeof row.name !== "string") throw new Error("煞气查询接口数据不完整");
	}
	return data;
}
async function claimBackendKillGodTitle(bid, uid, request) {
	return parseBackendKillGodTitleClaim(await requestBackend(identity(bid), "post_players_id_kill_god_title_claim", {
		path: { id: uid },
		...writeContext(request)
	}));
}
function parseBackendKillGodTitleClaim(value) {
	const code = record(value).code;
	if (typeof code !== "string" || ![
		"OK",
		"TITLE_NOT_FOUND",
		"NOT_RANK1",
		"LIST_TOO_SHORT",
		"ALREADY_CLAIMED"
	].includes(code)) throw new Error("领取杀神称号响应不完整");
	return code;
}
function parseRobotShaQi(value) {
	const info = parseBackendShaQi(value);
	if (!info) throw new Error("无法获取煞气信息");
	return info;
}
function parseRobotKillGodTitleClaim(value) {
	const code = parseBackendKillGodTitleClaim(value);
	if (code !== "OK") throw new Error("领取杀神称号响应不完整");
	return code;
}

//#endregion
export { claimBackendKillGodTitle, getBackendKillGodRanking, getBackendShaQi, parseBackendKillGodRanking, parseBackendKillGodTitleClaim, parseBackendShaQi, parseRobotKillGodTitleClaim, parseRobotShaQi };