import { requestBackend, writeContext } from "./client.js";
import { parsePositiveIssuedRewards } from "../schemas/issued-reward.js";

//#region src/api/bot/activity-points-claim.ts
function row(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("活跃奖励响应不完整");
	return value;
}
function parseBackendActivityClaim(value) {
	const item = row(value);
	if (typeof item.userName !== "string" || typeof item.requiredPoints !== "number" || !Number.isSafeInteger(item.requiredPoints) || item.requiredPoints <= 0) throw new Error("活跃奖励响应不完整");
	if (item.treasureMapBackfillOnly !== void 0 && typeof item.treasureMapBackfillOnly !== "boolean") throw new Error("周活补图回执不完整");
	if (item.treasureMapsUnavailableReason !== void 0 && typeof item.treasureMapsUnavailableReason !== "string") throw new Error("周活藏宝图回执不完整");
	let treasureMaps;
	if (item.treasureMaps !== void 0 && item.treasureMaps !== null) {
		const grant = row(item.treasureMaps);
		if (typeof grant.week !== "string" || typeof grant.configVersion !== "string" || typeof grant.alreadyGranted !== "boolean" || ![
			"requiredPoints",
			"itemId",
			"quantity"
		].every((key) => Number.isSafeInteger(grant[key]) && Number(grant[key]) > 0)) throw new Error("周活藏宝图回执不完整");
		treasureMaps = {
			week: grant.week,
			requiredPoints: grant.requiredPoints,
			itemId: grant.itemId,
			quantity: grant.quantity,
			alreadyGranted: grant.alreadyGranted,
			configVersion: grant.configVersion
		};
	}
	return {
		userName: item.userName,
		requiredPoints: item.requiredPoints,
		issued: parsePositiveIssuedRewards(item.issued, "活跃奖励响应不完整"),
		...item.treasureMapBackfillOnly !== void 0 ? { treasureMapBackfillOnly: item.treasureMapBackfillOnly } : {},
		...typeof item.treasureMapsUnavailableReason === "string" ? { treasureMapsUnavailableReason: item.treasureMapsUnavailableReason } : {},
		...treasureMaps ? { treasureMaps } : {}
	};
}
async function claimBackendActivityReward(bid, uid, type, requiredPoints, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(requiredPoints) || requiredPoints <= 0) throw new Error("活跃奖励领取参数无效");
	return parseBackendActivityClaim(await requestBackend(bid, "post_players_id_activities_rewardType_claim", {
		path: {
			id: uid,
			rewardType: type
		},
		body: { requiredPoints },
		...writeContext(request)
	}));
}
async function claimAllBackendActivityRewards(bid, uid, type, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("活跃奖励领取参数无效");
	return parseBackendActivityClaimAll(await requestBackend(bid, "post_players_id_activities_rewardType_claim_all", {
		path: {
			id: uid,
			rewardType: type
		},
		...writeContext(request)
	}));
}
function parseBackendActivityClaimAll(value) {
	const result = row(value);
	if (!Array.isArray(result.claimed) || typeof result.partial !== "boolean" || result.error !== void 0 && typeof result.error !== "string" || result.userName !== void 0 && typeof result.userName !== "string") throw new Error("活跃奖励响应不完整");
	const taskRewards = result.taskRewards === void 0 ? [] : parsePositiveIssuedRewards(result.taskRewards, "活跃任务奖励响应不完整");
	if (result.claimed.length === 0 && (taskRewards.length === 0 || typeof result.userName !== "string" || !result.userName.trim())) throw new Error("活跃奖励响应不完整");
	return {
		...typeof result.userName === "string" ? { userName: result.userName } : {},
		...result.taskRewards !== void 0 ? { taskRewards } : {},
		claimed: result.claimed.map(parseBackendActivityClaim),
		partial: result.partial,
		...typeof result.error === "string" ? { error: result.error } : {}
	};
}

//#endregion
export { claimAllBackendActivityRewards, claimBackendActivityReward, parseBackendActivityClaim, parseBackendActivityClaimAll };