import { requestBackend, writeContext } from "./client.js";
import { parseNormalExperienceGained, parseTreasureEffects } from "./treasure-effects.js";
import { parseNamedBattleUnit } from "../schemas/named-battle-unit.js";

//#region src/api/bot/bounty-actions.ts
const row = (value) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("悬赏接口响应不完整");
	return value;
};
const positiveInteger = (value) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const nonnegativeInteger = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
const finiteNumber = (value) => typeof value === "number" && Number.isFinite(value);
async function getBackendBountyPublishPolicy(bid) {
	if (!bid?.trim()) throw new Error("悬赏规则查询缺少平台身份");
	return parseBackendBountyPublishPolicy(await requestBackend(bid, "get_bounties_publish_policy"));
}
function parseBackendBountyPublishPolicy(value) {
	const data = row(value);
	for (const field of [
		"maxAmount",
		"minPerPerson",
		"minCompletions",
		"maxCompletions",
		"defaultCompletions",
		"feePercent",
		"validHours"
	]) if (!positiveInteger(data[field])) throw new Error("悬赏发布规则响应不完整");
	return data;
}
async function publishBackendBounty(bid, uid, targetId, amount, maxCompletions, request) {
	if (!bid?.trim() || ![uid, targetId].every(positiveInteger) || !Number.isSafeInteger(amount) || maxCompletions !== void 0 && !Number.isSafeInteger(maxCompletions)) throw new Error("悬赏参数无效");
	return parseBackendPublishedBounty(await requestBackend(bid, "post_players_id_bounties", {
		path: { id: uid },
		body: {
			targetId,
			amount,
			...maxCompletions === void 0 ? {} : { maxCompletions }
		},
		...writeContext(request)
	}));
}
function parseBackendPublishedBounty(value) {
	const data = row(value);
	if (!positiveInteger(data.id) || !integer(data.totalCost) || !integer(data.fee) || !integer(data.rewardPool) || !integer(data.rewardPerCompletion) || !integer(data.maxCompletions) || typeof data.targetName !== "string" || !positiveInteger(data.validHours)) throw new Error("悬赏发布响应不完整");
	return {
		bountyId: data.id,
		totalCost: data.totalCost,
		fee: data.fee,
		rewardPool: data.rewardPool,
		rewardPerPerson: data.rewardPerCompletion,
		maxCompletions: data.maxCompletions,
		targetName: data.targetName,
		validHours: data.validHours
	};
}
async function claimBackendBounty(bid, bountyId, request) {
	if (!bid?.trim() || !positiveInteger(bountyId)) throw new Error("领赏参数无效");
	const data = row(await requestBackend(bid, "post_bounties_bountyId_claim", {
		path: { bountyId },
		...writeContext(request)
	}));
	if (data.code !== "SPIRIT_CRYSTAL" || !positiveInteger(data.changeAmount)) throw new Error("领赏响应不完整");
	return { rewardAmount: data.changeAmount };
}
async function getBackendPendingBountyRewards(bid, uid) {
	if (!bid?.trim() || !positiveInteger(uid)) throw new Error("待领赏金参数无效");
	return parseBackendPendingBountyRewards(await requestBackend(bid, "get_players_id_bounties_pending_rewards", { path: { id: uid } }));
}
function parseBackendPendingBountyRewards(data) {
	if (!Array.isArray(data)) throw new Error("待领赏金响应不完整");
	return data.map((value) => {
		const item = row(value);
		if (!positiveInteger(item.bountyId) || typeof item.targetName !== "string" || !positiveInteger(item.rewardAmount)) throw new Error("待领赏金响应不完整");
		return {
			bountyId: item.bountyId,
			targetName: item.targetName,
			rewardAmount: item.rewardAmount
		};
	});
}
const battleUnit = (value) => parseNamedBattleUnit(value, "接赏战斗单位响应不完整");
async function acceptBackendBounty(bid, bountyId, request) {
	if (!bid?.trim() || !positiveInteger(bountyId)) throw new Error("接赏参数无效");
	return parseBackendBountyAccept(await requestBackend(bid, "post_bounties_bountyId_accept", {
		path: { bountyId },
		...writeContext(request)
	}));
}
function parseBackendBountyAccept(value) {
	const data = row(value);
	if (typeof data.battleWon !== "boolean" || typeof data.targetName !== "string" || !nonnegativeInteger(data.qiCost) || !nonnegativeInteger(data.remainingCount) || !positiveInteger(data.dailyAcceptLimit) || data.remainingCount > data.dailyAcceptLimit || !integer(data.expReward) || !integer(data.streak) || !finiteNumber(data.streakBonus) || !finiteNumber(data.shaQiBonus) || typeof data.bonusText !== "string" || typeof data.losingStreakText !== "string") throw new Error("接赏响应不完整");
	const battle = row(data.battle);
	if (!integer(battle.Rounds) || !Array.isArray(battle.SideA) || !Array.isArray(battle.SideB)) throw new Error("接赏战斗响应不完整");
	if (data.completionId !== void 0 && !positiveInteger(data.completionId) || data.logId !== void 0 && typeof data.logId !== "string" || ![
		"bountyReward",
		"stoneReward",
		"crystalReward"
	].every((field) => data[field] === void 0 || integer(data[field]))) throw new Error("接赏响应不完整");
	const completionId = positiveInteger(data.completionId) ? data.completionId : void 0;
	const logId = typeof data.logId === "string" && data.logId ? data.logId : void 0;
	const dropped = data.droppedItem === void 0 ? void 0 : row(data.droppedItem);
	let droppedItem;
	if (dropped) {
		if (typeof dropped.category !== "string" || typeof dropped.name !== "string" || !positiveInteger(dropped.quantity)) throw new Error("接赏掉落响应不完整");
		droppedItem = {
			category: dropped.category,
			name: dropped.name,
			quantity: dropped.quantity
		};
	}
	return {
		treasureEffects: parseTreasureEffects(data.treasureEffects),
		normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
		battleWon: data.battleWon,
		completionId,
		logId,
		bountyReward: integer(data.bountyReward) ? data.bountyReward : void 0,
		stoneReward: integer(data.stoneReward) ? data.stoneReward : void 0,
		crystalReward: integer(data.crystalReward) ? data.crystalReward : void 0,
		droppedItem,
		expReward: data.expReward,
		streak: data.streak,
		streakBonus: data.streakBonus,
		shaQiBonus: data.shaQiBonus,
		bonusText: data.bonusText,
		losingStreakText: data.losingStreakText,
		targetName: data.targetName,
		qiCost: data.qiCost,
		remainingCount: data.remainingCount,
		dailyAcceptLimit: data.dailyAcceptLimit,
		battleResult: {
			totalRounds: battle.Rounds,
			finalState: {
				sideA: battle.SideA.map(battleUnit),
				sideB: battle.SideB.map(battleUnit)
			}
		}
	};
}
function parseRobotBountyClaim(value) {
	const data = row(value);
	if (data.outcome === "list") return {
		outcome: "list",
		pending: parseBackendPendingBountyRewards(data.pending)
	};
	if (data.outcome === "claimed" && positiveInteger(data.rewardAmount)) return {
		outcome: "claimed",
		rewardAmount: data.rewardAmount
	};
	throw new Error("领赏响应不完整");
}
function parseRobotBountyPublish(value) {
	const data = row(value);
	if (data.outcome === "policy") return {
		outcome: "policy",
		policy: parseBackendBountyPublishPolicy(data.policy)
	};
	if (data.outcome === "published") return {
		outcome: "published",
		data: parseBackendPublishedBounty(data.data)
	};
	throw new Error("悬赏发布响应不完整");
}
/** The existing accepted-bounty challenge receipt; no synthetic completion IDs. */
function parseRobotBountyChallenge(value) {
	const data = row(value);
	const battle = row(data.battle);
	if (typeof data.won !== "boolean" || !integer(data.experienceGained) || !nonnegativeInteger(data.rewardAmount) || !nonnegativeInteger(data.qiCost) || !nonnegativeInteger(data.remainingCount) || !positiveInteger(data.dailyAcceptLimit) || data.remainingCount > data.dailyAcceptLimit || !nonnegativeInteger(battle.Rounds) || !Array.isArray(battle.SideA) || !Array.isArray(battle.SideB) || data.logId !== void 0 && typeof data.logId !== "string") throw new Error("继续接赏响应不完整");
	return {
		treasureEffects: parseTreasureEffects(data.treasureEffects),
		normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
		won: data.won,
		experienceGained: data.experienceGained,
		rewardAmount: data.rewardAmount,
		qiCost: data.qiCost,
		remainingCount: data.remainingCount,
		dailyAcceptLimit: data.dailyAcceptLimit,
		logId: typeof data.logId === "string" && data.logId ? data.logId : void 0,
		battle: {
			rounds: battle.Rounds,
			sideA: battle.SideA.map(battleUnit),
			sideB: battle.SideB.map(battleUnit)
		}
	};
}

//#endregion
export { acceptBackendBounty, claimBackendBounty, getBackendBountyPublishPolicy, getBackendPendingBountyRewards, parseBackendBountyAccept, parseBackendBountyPublishPolicy, parseBackendPendingBountyRewards, parseBackendPublishedBounty, parseRobotBountyChallenge, parseRobotBountyClaim, parseRobotBountyPublish, publishBackendBounty };