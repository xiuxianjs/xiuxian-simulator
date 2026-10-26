import { getBackendTowerRewardOverview } from "../../../api/bot/tower-reward-overview-queries.js";

//#region src/response-apps/ranking/rewards/app.ts
async function App(params) {
	const data = await getBackendTowerRewardOverview(params.bid, params.uid);
	if (!data.canUseFifthLayerFeature) return {
		code: "LOCKED",
		realmName: data.realmName ?? "未知"
	};
	const monthlyMessage = data.monthlyClaimStatus === "NOT_RANKED" ? "本月未上榜，无月度奖励" : "所有月度奖励已领取";
	return {
		code: "OK",
		data: {
			userRank: data.userRank,
			maxRank: data.maxRank,
			firstRewards: data.firstRewards.map((reward) => ({
				...reward,
				description: reward.description ?? void 0,
				status: reward.canClaim ? "✅可领取" : "⏸️未达成"
			})),
			monthlyTextLines: data.currentDay === 1 ? ["月度奖励领取中（仅限每月1日）", data.monthlyClaimable ? "✅ 可领取本月奖励" : `⏸️ ${monthlyMessage}`] : ["月度奖励将在每月1日发放", "根据上月最终排名领取奖励"],
			claimableRankings: data.firstRewards.filter((reward) => reward.canClaim).map((reward) => reward.ranking),
			monthlyClaimable: data.monthlyClaimable
		}
	};
}

//#endregion
export { App as default };