import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/world-boss-challenge.ts
function row(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function integer(value, field) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`凶兽挑战响应字段无效: ${field}`);
	return value;
}
function text(value, field) {
	if (typeof value !== "string") throw new Error(`凶兽挑战响应字段无效: ${field}`);
	return value;
}
function unit(value) {
	const data = row(value, "凶兽战斗单位不完整");
	const hp = integer(data.HP ?? data.hp, "battle.hp");
	const maxHp = integer(data.MaxHP ?? data.maxHp, "battle.maxHp");
	const position = integer(data.Position ?? data.position, "battle.position");
	const isDead = data.Dead ?? data.IsDead ?? data.isDead;
	if (typeof isDead !== "boolean" || hp > maxHp) throw new Error("凶兽战斗单位不完整");
	return {
		id: text(data.ID ?? data.id, "battle.id"),
		name: text(data.Name ?? data.name, "battle.name"),
		hp,
		maxHp,
		isDead,
		position
	};
}
function battle(value) {
	const data = row(value, "凶兽战斗回执不完整");
	const winner = text(data.Winner ?? data.winner, "battle.winner");
	const sideA = data.SideA ?? data.sideA;
	const sideB = data.SideB ?? data.sideB;
	if (winner !== "A" && winner !== "B" && winner !== "draw" || !Array.isArray(sideA) || !Array.isArray(sideB)) throw new Error("凶兽战斗回执不完整");
	return {
		winner,
		totalRounds: integer(data.Rounds ?? data.totalRounds, "battle.rounds"),
		finalState: {
			sideA: sideA.map(unit),
			sideB: sideB.map(unit)
		}
	};
}
function battleSummary(value) {
	const data = row(value, "凶兽战斗统计不完整");
	return {
		sideACount: integer(data.sideACount, "battleSummary.sideACount"),
		sideBCount: integer(data.sideBCount, "battleSummary.sideBCount"),
		totalDamageA: integer(data.totalDamageA, "battleSummary.totalDamageA"),
		totalDamageB: integer(data.totalDamageB, "battleSummary.totalDamageB"),
		totalHealsA: integer(data.totalHealsA, "battleSummary.totalHealsA"),
		totalHealsB: integer(data.totalHealsB, "battleSummary.totalHealsB")
	};
}
function round(value) {
	const data = row(value, "凶兽挑战回执不完整");
	const rank = data.rank;
	if (rank !== null && rank !== void 0 && (typeof rank !== "number" || !Number.isSafeInteger(rank) || rank < 1)) throw new Error("凶兽挑战回执不完整");
	return {
		damageDealt: integer(data.damageDealt, "damageDealt"),
		totalPlayerDamage: integer(data.totalPlayerDamage, "totalPlayerDamage"),
		attackCount: integer(data.attackCount, "attackCount"),
		remainingAttempts: integer(data.remainingAttempts, "remainingAttempts"),
		rank: rank ?? null,
		battle: battle(data.battle),
		battleSummary: battleSummary(data.battleSummary),
		logId: text(data.logId, "logId"),
		stageName: text(data.stageName, "stageName"),
		bossTitle: text(data.bossTitle, "bossTitle"),
		bossName: text(data.bossName, "bossName")
	};
}
function valid(bid, uid) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("凶兽挑战参数无效");
}
async function challengeBackendWorldBoss(bid, uid, useAllAttempts, request) {
	valid(bid, uid);
	return parseWorldBossChallenge(await requestBackend(bid, useAllAttempts ? "post_players_id_world_boss_challenge_all" : "post_players_id_world_boss_challenge", {
		headers: repeatPresentationHeaders("挑战凶兽"),
		path: { id: uid },
		body: {},
		...writeContext(request)
	}), useAllAttempts);
}
function parseWorldBossChallenge(value, useAllAttempts) {
	const data = row(value, "凶兽挑战响应不完整");
	if (!useAllAttempts) return round(data);
	if (!Array.isArray(data.rounds)) throw new Error("凶兽批量挑战响应不完整");
	return {
		...typeof data.stopReason === "string" && data.stopReason ? { stopReason: data.stopReason } : {},
		rounds: data.rounds.map(round),
		attemptsUsed: integer(data.attemptsUsed, "attemptsUsed"),
		totalDamageDealt: integer(data.totalDamageDealt, "totalDamageDealt"),
		lastRound: round(data.lastRound),
		stageName: text(data.stageName, "stageName"),
		bossTitle: text(data.bossTitle, "bossTitle"),
		bossName: text(data.bossName, "bossName"),
		remainingAttempts: integer(data.remainingAttempts, "remainingAttempts")
	};
}

//#endregion
export { challengeBackendWorldBoss, parseWorldBossChallenge };