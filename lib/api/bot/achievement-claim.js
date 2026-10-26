import { requestBackend, writeContext } from "./client.js";
import { parsePositiveIssuedRewards } from "../schemas/issued-reward.js";

//#region src/api/bot/achievement-claim.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("成就领取响应不完整");
	return value;
}
function validateBackendAchievementClaim(value) {
	const row = record(value);
	if (typeof row.claimedCount !== "number" || !Number.isSafeInteger(row.claimedCount) || row.claimedCount < 1 || !Array.isArray(row.claimed)) throw new Error("成就领取响应不完整");
	const claimed = row.claimed.map((value) => {
		const item = record(value);
		if (typeof item.category !== "string" || typeof item.categoryLabel !== "string" || typeof item.achievementName !== "string" || !Array.isArray(item.issued)) throw new Error("成就领取响应不完整");
		const rewardText = parsePositiveIssuedRewards(item.issued, "成就领取响应不完整").map((reward) => `${reward.name}×${reward.amount}`).join("、");
		return {
			category: item.category,
			categoryLabel: item.categoryLabel,
			achievementName: item.achievementName,
			rewardText
		};
	});
	if (claimed.length !== row.claimedCount) throw new Error("成就领取响应不完整");
	return {
		claimed,
		claimedCount: row.claimedCount
	};
}
async function claimBackendAchievementRewards(bid, uid, category, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return validateBackendAchievementClaim(await requestBackend(bid, "post_players_id_achievements_claim", {
		path: { id: uid },
		body: { category },
		...writeContext(request)
	}));
}

//#endregion
export { claimBackendAchievementRewards, validateBackendAchievementClaim };