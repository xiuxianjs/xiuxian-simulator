import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/tower-reward-claims.ts
function parseTowerRewardClaim(value, required) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("排名奖励结算响应不完整");
	const row = value;
	if (!Array.isArray(row.rewardTexts) || !row.rewardTexts.every((text) => typeof text === "string")) throw new Error("排名奖励结算响应不完整");
	for (const field of ["claimedCount", "ranking"]) {
		const value = row[field];
		if (field !== required && value === void 0) continue;
		if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new Error("排名奖励结算响应不完整");
	}
	return row;
}
async function claimBackendFirstRewards(bid, uid, ranking, request) {
	const context = writeContext(request);
	if (ranking === "all") return parseTowerRewardClaim(await requestBackend(bid, "post_players_id_tower_rank_rewards_first_claim_all", {
		headers: repeatPresentationHeaders("领取首通奖励"),
		path: { id: uid },
		...context
	}), "claimedCount");
	return parseTowerRewardClaim(await requestBackend(bid, "post_players_id_tower_rank_rewards_first_ranking_claim", {
		headers: repeatPresentationHeaders("领取首通奖励"),
		path: {
			id: uid,
			ranking
		},
		...context
	}), "ranking");
}
async function claimBackendMonthlyRewards(bid, uid, rewardId, request, repeatCommand) {
	const context = writeContext(request);
	const body = rewardId === "all" ? {} : { rewardId };
	return parseTowerRewardClaim(await requestBackend(bid, "post_players_id_tower_rank_rewards_monthly_claim", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: { id: uid },
		body,
		...context
	}), "claimedCount");
}

//#endregion
export { claimBackendFirstRewards, claimBackendMonthlyRewards, parseTowerRewardClaim };