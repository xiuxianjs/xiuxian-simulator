import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-battle-training.ts
const nullableInteger = (value) => value === null || Number.isSafeInteger(value);
function completeLine(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const row = value;
	return [
		row.key,
		row.name,
		row.effectText
	].every((value) => typeof value === "string") && [row.level, row.maxLevel].every(Number.isSafeInteger) && [
		row.nextCostPrestige,
		row.nextCostSpiritStone,
		row.nextCostContribution
	].every(nullableInteger);
}
function parseGuildBattleTrainingState(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门战备响应不完整");
	const row = value;
	if (![
		row.guildId,
		row.guildLevel,
		row.prestige,
		row.spiritStone,
		row.contributionPoints,
		row.teamMaxLevel,
		row.personalMaxLevel
	].every(Number.isSafeInteger) || typeof row.guildName !== "string" || typeof row.unlocked !== "boolean" || typeof row.canUpgradeTeam !== "boolean" || !Array.isArray(row.team) || !Array.isArray(row.personal) || !row.team.every(completeLine) || !row.personal.every(completeLine)) throw new Error("宗门战备响应不完整");
	return row;
}
function parseGuildBattleTrainingUpgrade(value, branch, key) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门战备升级响应不完整");
	const row = value;
	if (row.branch !== branch || row.key !== key || typeof row.name !== "string" || !Number.isSafeInteger(row.newLevel) || typeof row.effectText !== "string" || typeof row.costText !== "string" || ![
		row.contributionPoints,
		row.prestige,
		row.spiritStone
	].every(nullableInteger)) throw new Error("宗门战备升级响应不完整");
	return row;
}
async function getBackendGuildBattleTraining(bid, uid) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildBattleTrainingState(await requestBackend(bid, "get_players_id_guild_battle_training", { path: { id: uid } }));
}
async function postBackendGuildBattleTraining(bid, uid, branch, key, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildBattleTrainingUpgrade(await requestBackend(bid, "post_players_id_guild_battle_training", {
		path: { id: uid },
		body: {
			branch,
			key
		},
		...writeContext(request)
	}), branch, key);
}

//#endregion
export { getBackendGuildBattleTraining, parseGuildBattleTrainingState, parseGuildBattleTrainingUpgrade, postBackendGuildBattleTraining };