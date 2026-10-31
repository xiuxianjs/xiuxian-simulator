import { requestBackend, writeContext } from "./client.js";
import { parseNormalExperienceGained, parseTreasureEffects } from "./treasure-effects.js";

//#region src/api/bot/tongtian-tower.ts
function row(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function integer(value, field, min = 0) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) throw new Error(`通天塔接口字段无效: ${field}`);
	return value;
}
function bool(value, field) {
	if (typeof value !== "boolean") throw new Error(`通天塔接口字段无效: ${field}`);
	return value;
}
function string(value, field) {
	if (typeof value !== "string") throw new Error(`通天塔接口字段无效: ${field}`);
	return value;
}
function array(value, field) {
	if (!Array.isArray(value)) throw new Error(`通天塔接口字段无效: ${field}`);
	return value;
}
function entry(value) {
	const data = row(value, "通天塔排名响应不完整");
	return {
		rank: integer(data.rank, "rank", 1),
		id: string(data.id, "id"),
		name: string(data.name, "name"),
		power: integer(data.power, "power"),
		isFake: bool(data.isFake, "isFake"),
		isMe: bool(data.isMe, "isMe")
	};
}
function unit(value) {
	const data = row(value, "通天塔战斗单位响应不完整");
	return {
		name: string(data.Name ?? data.name, "unit.name"),
		hp: integer(data.HP ?? data.hp, "unit.hp"),
		maxHp: integer(data.MaxHP ?? data.maxHp, "unit.maxHp", 1),
		isDead: bool(data.Dead ?? data.dead ?? data.IsDead ?? data.isDead, "unit.isDead")
	};
}
function battle(value) {
	const data = row(value, "通天塔战斗响应不完整");
	const winner = string(data.Winner ?? data.winner, "battle.winner");
	if (winner !== "A" && winner !== "B" && winner !== "draw") throw new Error("通天塔接口字段无效: battle.winner");
	return {
		winner,
		rounds: integer(data.Rounds ?? data.rounds, "battle.rounds"),
		sideA: array(data.SideA ?? data.sideA, "battle.sideA").map(unit),
		sideB: array(data.SideB ?? data.sideB, "battle.sideB").map(unit)
	};
}
function parseTongtianChallenge(value) {
	const data = row(value, "通天塔挑战响应不完整");
	return {
		treasureEffects: parseTreasureEffects(data.treasureEffects),
		normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
		...typeof data.logId === "string" ? { logId: data.logId } : {},
		success: bool(data.success, "success"),
		message: string(data.message, "message"),
		oldRank: integer(data.oldRank, "oldRank", 1),
		newRank: integer(data.newRank, "newRank", 1),
		rankImproved: bool(data.rankImproved, "rankImproved"),
		experienceGained: integer(data.experienceGained, "experienceGained"),
		baseExperience: integer(data.baseExperience, "baseExperience"),
		experienceBonusText: string(data.experienceBonusText, "experienceBonusText"),
		reputationGained: integer(data.reputationGained, "reputationGained"),
		battle: battle(data.battle)
	};
}
function requireParams(bid, uid) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("通天塔操作参数无效");
}
async function getBackendTongtianTower(bid, uid) {
	requireParams(bid, uid);
	return parseTongtianTower(await requestBackend(bid, "get_players_id_tongtian_tower", { path: { id: uid } }));
}
function parseTongtianTower(value) {
	const data = row(value, "通天塔响应不完整");
	const output = {
		isOpen: bool(data.isOpen, "isOpen"),
		myRank: integer(data.myRank, "myRank", 1),
		top3: array(data.top3, "top3").map(entry),
		nearby: array(data.nearby, "nearby").map(entry),
		challengeCost: integer(data.challengeCost, "challengeCost"),
		challengeTip: string(data.challengeTip, "challengeTip"),
		rewardTip: string(data.rewardTip, "rewardTip"),
		sweepTargets: array(data.sweepTargets, "sweepTargets").map(entry)
	};
	if (typeof data.message === "string") output.message = data.message;
	return output;
}
async function challengeBackendTongtianTower(bid, uid, targetRank, request) {
	requireParams(bid, uid);
	if (!Number.isSafeInteger(targetRank) || targetRank < 1 || targetRank > 1999) throw new Error("目标排名无效");
	return parseTongtianChallenge(await requestBackend(bid, "post_players_id_tongtian_tower_challenges", {
		path: { id: uid },
		body: { targetRank },
		...writeContext(request)
	}));
}
async function sweepBackendTongtianTower(bid, uid, targetRank, count, request) {
	requireParams(bid, uid);
	return parseTongtianSweep(await requestBackend(bid, "post_players_id_tongtian_tower_sweeps", {
		path: { id: uid },
		body: {
			targetRank,
			count
		},
		...writeContext(request)
	}));
}
function parseTongtianSweep(value) {
	const data = row(value, "通天塔扫荡响应不完整");
	return {
		treasureEffects: parseTreasureEffects(data.treasureEffects),
		normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
		targetRank: integer(data.targetRank, "targetRank", 1),
		sweepCount: integer(data.sweepCount, "sweepCount", 1),
		qiSpent: integer(data.qiSpent, "qiSpent"),
		experienceGained: integer(data.experienceGained, "experienceGained"),
		baseExperience: integer(data.baseExperience, "baseExperience"),
		experienceBonusText: string(data.experienceBonusText, "experienceBonusText"),
		reputationGained: integer(data.reputationGained, "reputationGained")
	};
}
async function batchChallengeBackendTongtianTower(bid, uid, request) {
	requireParams(bid, uid);
	return parseTongtianBatch(await requestBackend(bid, "post_players_id_tongtian_tower_batch_challenges", {
		path: { id: uid },
		body: {},
		...writeContext(request)
	}));
}
function parseTongtianBatch(value) {
	const data = row(value, "通天塔连续挑战响应不完整");
	const events = array(data.events, "events").map((value) => {
		const event = row(value, "通天塔连续挑战事件不完整");
		const parsed = {
			index: integer(event.index, "event.index", 1),
			outcome: string(event.outcome, "event.outcome"),
			message: string(event.message, "event.message"),
			displayText: string(event.displayText, "event.displayText"),
			needPotion: bool(event.needPotion, "event.needPotion")
		};
		if (event.targetRank !== void 0) parsed.targetRank = integer(event.targetRank, "event.targetRank", 1);
		if (event.challenge !== void 0) parsed.challenge = parseTongtianChallenge(event.challenge);
		if (event.logId !== void 0) parsed.logId = string(event.logId, "event.logId");
		return parsed;
	});
	const output = {
		treasureEffects: parseTreasureEffects(data.treasureEffects),
		normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
		startRank: integer(data.startRank, "startRank", 1),
		finalRank: integer(data.finalRank, "finalRank", 1),
		rounds: array(data.rounds, "rounds").map(parseTongtianChallenge),
		winCount: integer(data.winCount, "winCount"),
		lossCount: integer(data.lossCount, "lossCount"),
		experienceGained: integer(data.experienceGained, "experienceGained"),
		experienceBonusText: string(data.experienceBonusText, "experienceBonusText"),
		reputationGained: integer(data.reputationGained, "reputationGained"),
		events
	};
	if (output.winCount + output.lossCount !== output.rounds.length) throw new Error("通天塔连续挑战汇总响应不完整");
	if (typeof data.stopReason === "string") output.stopReason = data.stopReason;
	return output;
}

//#endregion
export { batchChallengeBackendTongtianTower, challengeBackendTongtianTower, getBackendTongtianTower, parseTongtianBatch, parseTongtianChallenge, parseTongtianSweep, parseTongtianTower, sweepBackendTongtianTower };