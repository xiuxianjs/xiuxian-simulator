import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parseNormalExperienceGained, parseTreasureEffects } from "./treasure-effects.js";
import { logger } from "alemonjs";

//#region src/api/bot/dungeon-challenge.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const battleWinner = (value) => typeof value === "string" && [
	"A",
	"B",
	"draw"
].includes(value);
const rewards = (value) => {
	if (!Array.isArray(value)) throw new Error("秘境挑战结算响应不完整");
	return value.map((row) => {
		if (!record(row) || !integer(row.userId) || typeof row.eligible !== "boolean" || !integer(row.spiritCostPaid) || !integer(row.experienceGained) || row.noRewardReason !== void 0 && typeof row.noRewardReason !== "string") throw new Error("秘境挑战成员结算响应不完整");
		const rewardList = (raw) => {
			if (!Array.isArray(raw)) throw new Error("秘境挑战奖励响应不完整");
			return raw.map((item) => {
				if (!record(item) || typeof item.category !== "string" || typeof item.name !== "string" || !integer(item.amount)) throw new Error("秘境挑战奖励明细不完整");
				return {
					category: item.category,
					name: item.name,
					amount: item.amount
				};
			});
		};
		return {
			treasureEffects: parseTreasureEffects(row.treasureEffects),
			normalExperienceGained: parseNormalExperienceGained(row.normalExperienceGained),
			normalItems: row.normalItems === void 0 ? void 0 : rewardList(row.normalItems),
			userId: row.userId,
			eligible: row.eligible,
			...typeof row.noRewardReason === "string" ? { noRewardReason: row.noRewardReason } : {},
			spiritCostPaid: row.spiritCostPaid,
			experienceGained: row.experienceGained,
			currency: rewardList(row.currency),
			items: rewardList(row.items),
			...row.firstClear === void 0 ? {} : { firstClear: rewardList(row.firstClear) }
		};
	});
};
async function challengeBackendDungeon(bid, uid, dungeonName, request, repeatCommand) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !dungeonName.trim()) throw new Error("秘境挑战请求参数无效");
	return parseDungeonChallenge(await requestBackend(bid, "post_players_id_dungeons_challenge", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: { id: uid },
		body: { dungeonName },
		...writeContext(request)
	}), request);
}
function parseDungeonChallenge(value, request) {
	const battle = record(value) && record(value.battle) ? value.battle : void 0;
	const winner = battle?.Winner ?? battle?.winner;
	const rounds = battle?.Rounds ?? battle?.rounds;
	const invalidFields = !record(value) ? ["data"] : [
		...!integer(value.dungeonId) ? ["dungeonId"] : [],
		...typeof value.won !== "boolean" ? ["won"] : [],
		...!integer(value.experienceGained) ? ["experienceGained"] : [],
		...!integer(value.spiritStoneGained) ? ["spiritStoneGained"] : [],
		...!battle ? ["battle"] : [],
		...!battleWinner(winner) ? ["battle.Winner/winner"] : [],
		...!integer(rounds) ? ["battle.Rounds/rounds"] : [],
		...!Array.isArray(value.drops) ? ["drops"] : [],
		...value.logId !== void 0 && typeof value.logId !== "string" ? ["logId"] : []
	];
	if (!record(value) || !integer(value.dungeonId) || typeof value.won !== "boolean" || !integer(value.experienceGained) || !integer(value.spiritStoneGained) || !battleWinner(winner) || !integer(rounds) || !Array.isArray(value.drops) || value.logId !== void 0 && typeof value.logId !== "string") {
		logger.error("[秘境挑战响应校验失败]", {
			requestId: request?.requestId,
			invalidFields
		});
		throw new Error("秘境挑战响应不完整", { cause: { invalidFields } });
	}
	const drops = value.drops.map((drop) => {
		if (!record(drop) || typeof drop.category !== "string" || !integer(drop.amount) || drop.currencyCode !== void 0 && typeof drop.currencyCode !== "string" || drop.itemId !== void 0 && !integer(drop.itemId)) throw new Error("秘境挑战掉落响应不完整");
		return {
			category: drop.category,
			amount: drop.amount,
			...typeof drop.currencyCode === "string" ? { currencyCode: drop.currencyCode } : {},
			...integer(drop.itemId) ? { itemId: drop.itemId } : {}
		};
	});
	return {
		dungeonId: value.dungeonId,
		won: value.won,
		experienceGained: value.experienceGained,
		spiritStoneGained: value.spiritStoneGained,
		...typeof value.logId === "string" && value.logId ? { logId: value.logId } : {},
		battle: {
			winner,
			rounds
		},
		drops,
		rewardsByUser: rewards(value.rewardsByUser)
	};
}

//#endregion
export { challengeBackendDungeon, parseDungeonChallenge };