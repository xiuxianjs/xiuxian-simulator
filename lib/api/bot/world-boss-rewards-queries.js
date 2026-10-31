import { exactInteger } from "../core/exact-json.js";
import { requestBackend } from "./client.js";

//#region src/api/bot/world-boss-rewards-queries.ts
function integer(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("凶兽奖励接口缺少数值字段");
	return value;
}
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("凶兽奖励接口格式不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("凶兽奖励接口缺少文本字段");
	return value;
}
async function getBackendWorldBossRewards(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseWorldBossRewards(await requestBackend(bid, "get_players_id_world_boss_rewards_preview", { path: { id: uid } }));
}
function parseWorldBossRewards(value) {
	const data = record(value);
	const config = data.config === null ? null : record(data.config);
	if (!Array.isArray(data.tiers)) throw new Error("凶兽奖励接口缺少档位");
	return {
		stageLevel: integer(data.stageLevel),
		stageName: text(data.stageName),
		available: typeof data.available === "boolean" ? data.available : (() => {
			throw new Error("凶兽奖励资格字段不完整");
		})(),
		unavailableMessage: text(data.unavailableMessage),
		claimableRewardCount: integer(data.claimableRewardCount),
		config: config === null ? null : {
			bossName: text(config.bossName),
			bossTitle: text(config.bossTitle),
			baseDamage: exactInteger(config.baseDamage)
		},
		tiers: data.tiers.map((value) => {
			const row = record(value);
			return {
				tierName: text(row.tierName),
				damagePercent: integer(row.damagePercent),
				conditionText: text(row.conditionText),
				spiritStone: exactInteger(row.spiritStone),
				spiritCrystal: exactInteger(row.spiritCrystal)
			};
		})
	};
}

//#endregion
export { getBackendWorldBossRewards, parseWorldBossRewards };