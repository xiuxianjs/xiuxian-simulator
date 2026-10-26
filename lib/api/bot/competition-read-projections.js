import { requestBackend } from "./client.js";

//#region src/api/bot/competition-read-projections.ts
const record = (value) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门大比服务响应不完整");
	return value;
};
async function getBackendCompetitionHome(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseCompetitionHome(await requestBackend(bid, "get_players_id_guild_competition_home", { path: { id: uid } }));
}
function parseCompetitionHome(value) {
	const home = record(value);
	const view = record(home.view);
	const config = record(home.config);
	if (home.previousSeason !== void 0) {
		const previous = record(home.previousSeason);
		if (typeof previous.competitionId !== "string" || typeof previous.message !== "string" || typeof previous.teamStatusName !== "string" || !integer(previous.score) || !Array.isArray(previous.slots)) throw new Error("宗门大比上届记录响应不完整");
		for (const value of previous.slots) {
			const slot = record(value);
			if (!integer(slot.userId, 1) || !integer(slot.position, 1) || slot.position > 6 || typeof slot.name !== "string") throw new Error("宗门大比上届成员响应不完整");
		}
	}
	for (const key of [
		"registrationStartTime",
		"registrationEndTime",
		"knockoutStartTime",
		"knockoutEndTime",
		"promotionStartTime",
		"bettingEndTime",
		"settlementTime"
	]) if (typeof config[key] !== "string" || !Number.isFinite(new Date(config[key]).getTime())) throw new Error("宗门大比日程响应不完整");
	if (!integer(home.signupGuildCount, 0) || !integer(home.guildId, 0) || !integer(home.guildLevel, 0) || typeof home.guildName !== "string" || typeof home.teamStatusName !== "string") throw new Error("宗门大比宗门资料响应不完整");
	for (const key of [
		"team",
		"roster",
		"oddsInfo",
		"knockoutInfo"
	]) if (home[key] !== null) record(home[key]);
	if (!Array.isArray(home.topTeams)) throw new Error("宗门大比排名队伍响应不完整");
	home.topTeams.forEach(parsePromotionTeam);
	if (typeof view.phaseName !== "string" || typeof home.hasGuild !== "boolean" || typeof view.showSignupCount !== "boolean" || typeof view.canApply !== "boolean" || typeof view.showRoster !== "boolean" || typeof view.showResults !== "boolean" || typeof view.showKnockout !== "boolean" || typeof view.canChallenge !== "boolean" || typeof view.showOdds !== "boolean" || typeof view.showPromotionTeams !== "boolean") throw new Error("宗门大比主页资格响应不完整");
	if (home.team) {
		if (!integer(record(home.team).id, 1)) throw new Error("宗门大比队伍响应不完整");
		const roster = record(home.roster);
		if (!Array.isArray(roster.slots) || roster.slots.length !== 6 || typeof roster.canAdd !== "boolean" || typeof roster.canClear !== "boolean") throw new Error("宗门大比站位响应不完整");
		for (const item of roster.slots) {
			if (item === null) continue;
			const slot = record(item);
			if (!integer(slot.position, 1) || slot.position > 6 || !integer(slot.userId, 1) || typeof slot.name !== "string" || typeof slot.optionName !== "string" || typeof slot.canMoveUp !== "boolean" || typeof slot.canMoveDown !== "boolean" || typeof slot.canRemove !== "boolean") throw new Error("宗门大比站位响应不完整");
		}
	}
	if (home.oddsInfo) {
		const odds = record(home.oddsInfo);
		if (!Array.isArray(odds.items) || odds.items.some((value) => {
			const item = record(value);
			return !integer(item.guildId, 1) || typeof item.guildName !== "string" || typeof item.odds !== "number" || !Number.isFinite(item.odds) || typeof item.action !== "string" || ![
				"BET",
				"FOLLOW",
				""
			].includes(item.action);
		})) throw new Error("宗门大比押注资格响应不完整");
	}
	if (home.knockoutInfo) {
		const info = record(home.knockoutInfo);
		if (!integer(info.score) || !integer(info.remain) || !integer(info.rank) || typeof info.diffToPrevText !== "string") throw new Error("宗门大比排名响应不完整");
	}
	return home;
}
const integer = (value, minimum = -Infinity) => typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
function parsePromotionTeam(value) {
	const team = record(value);
	if (!integer(team.id, 1) || !integer(team.guildId, 1) || typeof team.guildName !== "string" || !integer(team.rank) || !integer(team.status) || !integer(team.wins, 0)) throw new Error("宗门大比晋级队伍响应不完整");
	return {
		id: team.id,
		guildId: team.guildId,
		guildName: team.guildName,
		rank: team.rank,
		status: team.status,
		wins: team.wins
	};
}
async function getBackendCompetitionBattleDetail(bid, uid, battleId) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseCompetitionBattleDetail(await requestBackend(bid, "get_players_id_guild_competition_battles_battle_id", { path: {
		id: uid,
		battleId
	} }));
}
function parseCompetitionBattleDetail(value) {
	const data = record(value);
	if (!integer(data.battleId, 1) || typeof data.stageName !== "string" || typeof data.battleTime !== "string" || !Number.isFinite(new Date(data.battleTime).getTime()) || typeof data.attackerName !== "string" || typeof data.defenderName !== "string" || typeof data.winnerName !== "string" || typeof data.isWin !== "boolean" || data.battleLogId !== null && typeof data.battleLogId !== "string") throw new Error("宗门大比战斗详情响应不完整");
	return {
		battleId: data.battleId,
		stageName: data.stageName,
		battleTime: data.battleTime,
		attackerName: data.attackerName,
		defenderName: data.defenderName,
		winnerName: data.winnerName,
		isWin: data.isWin,
		battleLogId: data.battleLogId
	};
}
async function getBackendPromotionTeams(bid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseCompetitionPromotionTeams(await requestBackend(bid, "get_guild_competitions_current_promotion_teams"));
}
function parseCompetitionPromotionTeams(value) {
	const data = record(value);
	if (!Array.isArray(data.teams)) throw new Error("宗门大比晋级队伍响应不完整");
	return { teams: data.teams.map(parsePromotionTeam) };
}

//#endregion
export { getBackendCompetitionBattleDetail, getBackendCompetitionHome, getBackendPromotionTeams, parseCompetitionBattleDetail, parseCompetitionHome, parseCompetitionPromotionTeams };