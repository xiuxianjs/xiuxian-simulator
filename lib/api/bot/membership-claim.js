import { parseBackendMonthCardOverview } from "./reward-claim-overview.js";

//#region src/api/bot/membership-claim.ts
function parseRobotMonthCardClaim(value) {
	const overview = parseBackendMonthCardOverview(value);
	if (overview.beforeTotal === 0 || !overview.claim || !overview.status) throw new Error("月卡每日奖励响应不完整");
	return {
		days: overview.claim.days,
		rewards: {
			spiritCrystal: overview.claim.rewards.spiritCrystal,
			huanHunDan: overview.claim.rewards.mentalPill,
			yangShenDan: overview.claim.rewards.qiPill
		},
		status: {
			prepaidCount: overview.status.prepaidCount ?? 0,
			claimedCount: overview.status.claimedCount,
			upcomingCount: overview.status.upcomingCount
		}
	};
}

//#endregion
export { parseRobotMonthCardClaim };