import { requestBackend, writeContext } from "./client.js";
import { parsePositiveIssuedRewards } from "../schemas/issued-reward.js";

//#region src/api/bot/limited-event-actions.ts
function row(value, label) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}响应不完整`);
	return value;
}
function positive(value, label) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new Error(`${label}无效`);
	return value;
}
function issued(value, label) {
	return parsePositiveIssuedRewards(value, `${label}奖励响应不完整`);
}
function requireInput(bid, uid, value, label) {
	const validBid = bid?.trim();
	if (!validBid || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(value) || value <= 0) throw new Error(`${label}参数无效`);
	return validBid;
}
async function claimBackendLimitedEventTask(bid, uid, taskId, request) {
	const validBid = requireInput(bid, uid, taskId, "活动任务领取");
	return parseBackendLimitedEventTask(row(await requestBackend(validBid, "post_players_id_limited_events_tasks_taskId_claim", {
		path: {
			id: uid,
			taskId
		},
		...writeContext(request)
	}), "活动任务领取"));
}
function parseBackendLimitedEventTask(value) {
	const result = row(value, "活动任务领取");
	if (typeof result.eventTitle !== "string" || typeof result.taskName !== "string") throw new Error("活动任务领取响应不完整");
	return {
		taskId: positive(result.taskId, "活动任务领取任务"),
		eventTitle: result.eventTitle,
		taskName: result.taskName,
		issued: issued(result.issued, "活动任务领取")
	};
}
async function buyBackendLimitedEventProduct(bid, uid, productId, buyCount, request) {
	const validBid = requireInput(bid, uid, productId, "活动商品购买");
	if (!Number.isSafeInteger(buyCount) || buyCount <= 0) throw new Error("活动商品购买数量无效");
	return parseBackendLimitedEventProduct(row(await requestBackend(validBid, "post_players_id_limited_events_shop_products_productId_purchase", {
		path: {
			id: uid,
			productId
		},
		body: { buyCount },
		...writeContext(request)
	}), "活动商品购买"));
}
function parseBackendLimitedEventProduct(value) {
	const result = row(value, "活动商品购买");
	if (typeof result.priceType !== "string" || typeof result.totalPrice !== "number") throw new Error("活动商品购买响应不完整");
	return {
		productId: positive(result.productId, "活动商品"),
		buyCount: positive(result.buyCount, "活动商品购买数量"),
		priceType: result.priceType,
		totalPrice: result.totalPrice,
		issued: issued(result.issued, "活动商品购买")
	};
}
async function claimBackendLimitedEventRechargeTier(bid, uid, subActivityId, tierLevel, request) {
	const validBid = requireInput(bid, uid, subActivityId, "活动充值领奖");
	if (!Number.isSafeInteger(tierLevel) || tierLevel <= 0) throw new Error("活动充值档位无效");
	return parseBackendLimitedEventRechargeTier(row(await requestBackend(validBid, "post_players_id_limited_events_recharge_tiers_subActivityId_claim", {
		path: {
			id: uid,
			subActivityId
		},
		body: { tierLevel },
		...writeContext(request)
	}), "活动充值领奖"));
}
function parseBackendLimitedEventRechargeTier(value) {
	const result = row(value, "活动充值领奖");
	return {
		subActivityId: positive(result.subActivityId, "活动充值子活动"),
		tierLevel: positive(result.tierLevel, "活动充值档位"),
		issued: issued(result.issued, "活动充值领奖")
	};
}

//#endregion
export { buyBackendLimitedEventProduct, claimBackendLimitedEventRechargeTier, claimBackendLimitedEventTask, parseBackendLimitedEventProduct, parseBackendLimitedEventRechargeTier, parseBackendLimitedEventTask };