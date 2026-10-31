import { exactInteger } from "../core/exact-json.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/world-boss-claim.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("凶兽奖励响应不完整");
	return value;
}
function item(value) {
	const row = record(value);
	if (typeof row.bossDate !== "string" || typeof row.stageName !== "string" || typeof row.tierName !== "string" || typeof row.stageLevel !== "number" || !Number.isSafeInteger(row.stageLevel) || row.stageLevel < 1) throw new Error("凶兽奖励条目不完整");
	return {
		bossDate: row.bossDate,
		stageLevel: row.stageLevel,
		stageName: row.stageName,
		tierName: row.tierName,
		spiritStone: exactInteger(row.spiritStone),
		spiritCrystal: exactInteger(row.spiritCrystal),
		playerDamage: exactInteger(row.playerDamage)
	};
}
async function claimAllBackendWorldBossRewards(bid, uid, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("凶兽领奖参数无效");
	return parseWorldBossClaimAll(await requestBackend(bid, "post_players_id_world_boss_rewards_claim_all", {
		path: { id: uid },
		...writeContext(request)
	}));
}
function parseWorldBossClaimAll(value) {
	const data = record(value);
	if (!Array.isArray(data.items)) throw new Error("凶兽奖励条目不完整");
	const result = {
		items: data.items.map(item),
		totalStone: exactInteger(data.totalStone),
		totalCrystal: exactInteger(data.totalCrystal)
	};
	const totals = result.items.reduce((sum, current) => ({
		stone: sum.stone + BigInt(current.spiritStone),
		crystal: sum.crystal + BigInt(current.spiritCrystal)
	}), {
		stone: 0n,
		crystal: 0n
	});
	if (totals.stone !== BigInt(result.totalStone) || totals.crystal !== BigInt(result.totalCrystal)) throw new Error("凶兽奖励合计不一致");
	return result;
}

//#endregion
export { claimAllBackendWorldBossRewards, parseWorldBossClaimAll };