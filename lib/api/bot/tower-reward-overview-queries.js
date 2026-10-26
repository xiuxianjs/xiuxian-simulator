import { requestBackend } from "./client.js";

//#region src/api/bot/tower-reward-overview-queries.ts
function object(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("通天塔奖励总览数据不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("通天塔奖励总览缺少数值");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error("通天塔奖励总览缺少状态");
	return value;
}
function nullableString(value) {
	if (value !== null && typeof value !== "string") throw new Error("通天塔奖励总览文本无效");
	return value;
}
async function getBackendTowerRewardOverview(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	const row = object(await requestBackend(bid, "get_players_id_tower_rank_rewards", { path: { id: uid } }));
	if (!Array.isArray(row.firstRewards) || typeof row.monthlyClaimStatus !== "string" || ![
		"AVAILABLE",
		"NOT_RANKED",
		"ALL_CLAIMED"
	].includes(row.monthlyClaimStatus)) throw new Error("通天塔奖励总览状态无效");
	return {
		canUseFifthLayerFeature: boolean(row.canUseFifthLayerFeature),
		realmName: nullableString(row.realmName),
		currentDay: number(row.currentDay),
		userRank: number(row.userRank),
		maxRank: number(row.maxRank),
		monthlyClaimStatus: row.monthlyClaimStatus,
		monthlyClaimable: boolean(row.monthlyClaimable),
		firstRewards: row.firstRewards.map((value) => {
			const reward = object(value);
			return {
				ranking: number(reward.ranking),
				canClaim: boolean(reward.canClaim),
				lingJing: number(reward.lingJing),
				spiritStone: number(reward.spiritStone),
				description: nullableString(reward.description)
			};
		})
	};
}

//#endregion
export { getBackendTowerRewardOverview };