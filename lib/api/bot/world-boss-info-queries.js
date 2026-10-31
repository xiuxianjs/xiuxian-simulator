import { exactInteger } from "../core/exact-json.js";
import { requestBackend } from "./client.js";

//#region src/api/bot/world-boss-info-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("凶兽资料数据不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("凶兽资料数值不完整");
	return value;
}
function integer(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("凶兽资料数值不完整");
	return value;
}
function remainingAttempts(value) {
	return value === "NaN" || value === "Infinity" || value === "-Infinity" ? value : number(value);
}
async function getBackendWorldBossInfo(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseWorldBossInfo(await requestBackend(bid, "get_players_id_world_boss_info_query", { path: { id: uid } }));
}
function parseWorldBossInfo(value) {
	const data = record(value);
	const config = record(data.config);
	if (typeof config.bossName !== "string" || typeof config.bossTitle !== "string" || typeof data.isActive !== "boolean" || typeof data.hasInstance !== "boolean") throw new Error("凶兽资料字段不完整");
	return {
		stageLevel: integer(data.stageLevel),
		stageName: typeof data.stageName === "string" ? data.stageName : (() => {
			throw new Error("凶兽资料境界字段不完整");
		})(),
		activeTimeDesc: typeof data.activeTimeDesc === "string" ? data.activeTimeDesc : (() => {
			throw new Error("凶兽资料活动时间字段不完整");
		})(),
		bossStatus: data.bossStatus === "ACTIVE" || data.bossStatus === "UNAVAILABLE" ? data.bossStatus : (() => {
			throw new Error("凶兽资料状态字段不完整");
		})(),
		canChallenge: typeof data.canChallenge === "boolean" ? data.canChallenge : (() => {
			throw new Error("凶兽资料挑战资格字段不完整");
		})(),
		rewardPendingUntilEnd: typeof data.rewardPendingUntilEnd === "boolean" ? data.rewardPendingUntilEnd : (() => {
			throw new Error("凶兽资料奖励状态字段不完整");
		})(),
		config: {
			bossName: config.bossName,
			bossTitle: config.bossTitle,
			baseHp: exactInteger(config.baseHp),
			dailyAttempts: integer(config.dailyAttempts),
			maxRounds: integer(config.maxRounds),
			activeStartHour: integer(config.activeStartHour),
			activeEndHour: integer(config.activeEndHour)
		},
		isActive: data.isActive,
		hasInstance: data.hasInstance,
		totalDamage: exactInteger(data.totalDamage),
		totalAttacks: integer(data.totalAttacks),
		playerDamage: exactInteger(data.playerDamage),
		playerAttacks: integer(data.playerAttacks),
		remainingAttempts: remainingAttempts(data.remainingAttempts),
		playerRank: data.playerRank === null ? null : integer(data.playerRank),
		claimableRewardCount: integer(data.claimableRewardCount)
	};
}

//#endregion
export { getBackendWorldBossInfo, parseWorldBossInfo };