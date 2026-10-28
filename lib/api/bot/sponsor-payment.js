import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/sponsor-payment.ts
const asRow = (value, message) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
};
const order = (value) => {
	const data = asRow(value, "支付订单响应不完整");
	const payAmount = data.payAmount;
	if (typeof data.orderNo !== "string" || !data.orderNo || !Number.isSafeInteger(payAmount) || typeof payAmount !== "number" || payAmount <= 0 || typeof data.status !== "string") throw new Error("支付订单响应不完整");
	return {
		orderNo: data.orderNo,
		payAmount,
		status: data.status
	};
};
var CheckoutPromotionDecodeError = class extends Error {
	orderNo;
	constructor(orderNo) {
		super(`原订单 ${orderNo} 的返利参与说明暂未取得，请先查询原订单，再恢复支付。`);
		this.orderNo = orderNo;
	}
};
async function createBackendSponsorPayment(bid, uid, amountYuan, request) {
	return parseBackendSponsorCheckout(await requestBackend(bid, "post_players_id_payments_orders", {
		path: { id: uid },
		body: {
			kind: "sponsor",
			amountYuan
		},
		...writeContext(request)
	}));
}
function parseBackendSponsorCheckout(value) {
	const data = asRow(value, "支付收银台响应不完整");
	if (typeof data.payUrl !== "string" || !data.payUrl) throw new Error("支付收银台响应不完整");
	if (typeof data.packageName !== "string" || !data.packageName) throw new Error("支付收银台响应不完整");
	const paymentOrder = order(data.order);
	if (paymentOrder.status !== "PENDING") throw new Error("新建赞助订单状态异常");
	return {
		order: paymentOrder,
		payUrl: data.payUrl,
		packageName: data.packageName
	};
}
async function getBackendSponsorPayment(bid, uid, orderNo) {
	return order(await requestBackend(bid, "get_players_id_payments_orders_orderNo", { path: {
		id: uid,
		orderNo
	} }));
}
async function cancelBackendSponsorPayment(bid, uid, orderNo, request) {
	const data = asRow(await requestBackend(bid, "post_players_id_payments_orders_orderNo_cancel", {
		path: {
			id: uid,
			orderNo
		},
		...writeContext(request)
	}), "取消支付订单响应不完整");
	if (typeof data.cancelled !== "boolean") throw new Error("取消支付订单响应不完整");
	return data.cancelled;
}
async function getBackendNormalPaymentSettlement(bid, uid, orderNo) {
	return parseBackendNormalPaymentSettlement(await requestBackend(bid, "get_players_id_payments_orders_orderNo_settlement", { path: {
		id: uid,
		orderNo
	} }));
}
function parseBackendNormalPaymentSettlement(value) {
	const data = asRow(value, "充值结算回执不完整");
	const rewards = asRow(data.packageRewards, "充值结算回执不完整");
	for (const key of [
		"spiritMilk",
		"spiritStone",
		"spiritCrystal"
	]) if (!Number.isFinite(rewards[key])) throw new Error("充值结算回执不完整");
	for (const key of [
		"items",
		"equipments",
		"skills"
	]) if (!Array.isArray(rewards[key])) throw new Error("充值结算回执不完整");
	if (typeof data.orderNo !== "string" || !Number.isFinite(data.bonusSpiritMilk) || typeof data.monthCardExtended !== "boolean" || typeof data.seclusionPassActivated !== "boolean") throw new Error("充值结算回执不完整");
	const vip = data.vipUpgrade === void 0 || data.vipUpgrade === null ? null : asRow(data.vipUpgrade, "充值结算回执不完整");
	if (vip && (!Number.isInteger(vip.oldLevel) || !Number.isInteger(vip.newLevel))) throw new Error("充值结算回执不完整");
	const spiritVein = data.spiritVein === void 0 || data.spiritVein === null ? void 0 : asRow(data.spiritVein, "灵脉租契回执不完整");
	const daily = data.dailyTreasurePack === void 0 || data.dailyTreasurePack === null ? void 0 : asRow(data.dailyTreasurePack, "每日礼包回执不完整");
	if (daily && (![
		"small",
		"medium",
		"large",
		"all"
	].includes(String(daily.sku)) || typeof daily.businessDate !== "string" || !Number.isFinite(Date.parse(daily.businessDate)) || !Number.isSafeInteger(daily.treasureMaps) || Number(daily.treasureMaps) < 0 || !Array.isArray(daily.fragments))) throw new Error("每日礼包回执不完整");
	const fragments = daily ? daily.fragments.map((value) => {
		const f = asRow(value, "每日礼包赠片回执不完整");
		if (!Number.isSafeInteger(f.treasureId) || typeof f.name !== "string" || !Number.isSafeInteger(f.rarity) || Number(f.rarity) < 4 || Number(f.rarity) > 6 || !Number.isSafeInteger(f.quantity) || Number(f.quantity) < 1) throw new Error("每日礼包赠片回执不完整");
		return {
			treasureId: f.treasureId,
			name: f.name,
			rarity: f.rarity,
			quantity: f.quantity
		};
	}) : [];
	if (spiritVein && (!Number.isSafeInteger(spiritVein.days) || Number(spiritVein.days) <= 0 || !Number.isSafeInteger(spiritVein.dailyCrystal) || Number(spiritVein.dailyCrystal) <= 0 || typeof spiritVein.startDate !== "string" || !Number.isFinite(Date.parse(spiritVein.startDate)) || typeof spiritVein.endDate !== "string" || !Number.isFinite(Date.parse(spiritVein.endDate)))) throw new Error("灵脉租契回执不完整");
	return {
		orderNo: data.orderNo,
		packageRewards: {
			spiritMilk: rewards.spiritMilk,
			spiritStone: rewards.spiritStone,
			spiritCrystal: rewards.spiritCrystal,
			items: rewards.items,
			equipments: rewards.equipments,
			skills: rewards.skills
		},
		bonusSpiritMilk: data.bonusSpiritMilk,
		vipUpgrade: vip ? {
			oldLevel: vip.oldLevel,
			newLevel: vip.newLevel
		} : null,
		newcomerDayGranted: Number.isInteger(data.newcomerDayGranted) ? data.newcomerDayGranted : null,
		monthCardExtended: data.monthCardExtended,
		seclusionPassActivated: data.seclusionPassActivated,
		...daily ? { dailyTreasurePack: {
			sku: daily.sku,
			businessDate: daily.businessDate,
			treasureMaps: daily.treasureMaps,
			fragments
		} } : {},
		...spiritVein ? { spiritVein: {
			days: spiritVein.days,
			dailyCrystal: spiritVein.dailyCrystal,
			startDate: spiritVein.startDate,
			endDate: spiritVein.endDate
		} } : {}
	};
}
async function createBackendNormalPayment(bid, uid, packageId, request) {
	return parseBackendNormalCheckout(await requestBackend(bid, "post_players_id_payments_orders", {
		path: { id: uid },
		body: {
			kind: "package",
			packageId
		},
		...writeContext(request)
	}));
}
function parseBackendNormalCheckout(value) {
	const data = asRow(value, "支付收银台响应不完整");
	if (typeof data.payUrl !== "string" || !data.payUrl) throw new Error("支付收银台响应不完整");
	if (typeof data.packageName !== "string" || !data.packageName) throw new Error("支付收银台响应不完整");
	const paymentOrder = order(data.order);
	if (paymentOrder.status !== "PENDING") throw new Error("新建充值订单状态异常");
	const promotionTexts = data.promotionTexts;
	if (promotionTexts === void 0 && paymentOrder.orderNo.startsWith("TD") || promotionTexts !== void 0 && (!Array.isArray(promotionTexts) || !promotionTexts.length || promotionTexts.some((line) => typeof line !== "string" || !line.trim()))) throw new CheckoutPromotionDecodeError(paymentOrder.orderNo);
	return {
		order: paymentOrder,
		payUrl: data.payUrl,
		packageName: data.packageName,
		...promotionTexts === void 0 ? {} : { promotionTexts }
	};
}
async function createBackendLimitedEventPayment(bid, uid, subActivityId, tierLevel, request) {
	return parseBackendLimitedEventCheckout(await requestBackend(bid, "post_players_id_payments_orders", {
		path: { id: uid },
		body: {
			kind: "limited_event",
			subActivityId,
			tierLevel
		},
		...writeContext(request)
	}));
}
function parseBackendLimitedEventCheckout(value) {
	const data = asRow(value, "支付收银台响应不完整");
	if (typeof data.payUrl !== "string" || !data.payUrl) throw new Error("支付收银台响应不完整");
	if (typeof data.packageName !== "string" || !data.packageName) throw new Error("支付收银台响应不完整");
	return {
		order: order(data.order),
		payUrl: data.payUrl,
		packageName: data.packageName
	};
}
async function getBackendLimitedEventPaymentSettlement(bid, uid, orderNo) {
	return parseBackendLimitedEventSettlement(await requestBackend(bid, "get_players_id_payments_orders_orderNo_limited_event_settlement", { path: {
		id: uid,
		orderNo
	} }));
}
function parseBackendLimitedEventSettlement(value) {
	const data = asRow(value, "活动充值结算回执不完整");
	if (typeof data.packageName !== "string" || !Array.isArray(data.rewardTexts) || !data.rewardTexts.every((x) => typeof x === "string")) throw new Error("活动充值结算回执不完整");
	const vip = data.vipUpgrade === void 0 || data.vipUpgrade === null ? null : asRow(data.vipUpgrade, "活动充值结算回执不完整");
	if (vip && (!Number.isInteger(vip.oldLevel) || !Number.isInteger(vip.newLevel))) throw new Error("活动充值结算回执不完整");
	return {
		packageName: data.packageName,
		rewardTexts: data.rewardTexts,
		vipUpgrade: vip ? {
			oldLevel: vip.oldLevel,
			newLevel: vip.newLevel
		} : null
	};
}
function parseRobotLimitedEventPaymentState(value) {
	const data = asRow(value, "活动支付状态响应不完整");
	const paymentOrder = order(data.order);
	if (typeof data.timedOut !== "boolean" || data.timedOut && typeof data.cancelled !== "boolean") throw new Error("活动支付状态响应不完整");
	return {
		order: paymentOrder,
		timedOut: data.timedOut,
		receipt: paymentOrder.status === "SUCCESS" ? parseBackendLimitedEventSettlement(data.receipt) : void 0
	};
}
function parseRobotSponsorPaymentState(value) {
	const data = asRow(value, "赞助支付状态响应不完整");
	const paymentOrder = order(data.order);
	if (typeof data.timedOut !== "boolean" || data.timedOut && typeof data.cancelled !== "boolean") throw new Error("赞助支付状态响应不完整");
	return {
		order: paymentOrder,
		timedOut: data.timedOut
	};
}

//#endregion
export { CheckoutPromotionDecodeError, cancelBackendSponsorPayment, createBackendLimitedEventPayment, createBackendNormalPayment, createBackendSponsorPayment, getBackendLimitedEventPaymentSettlement, getBackendNormalPaymentSettlement, getBackendSponsorPayment, parseBackendLimitedEventCheckout, parseBackendLimitedEventSettlement, parseBackendNormalCheckout, parseBackendNormalPaymentSettlement, parseBackendSponsorCheckout, parseRobotLimitedEventPaymentState, parseRobotSponsorPaymentState };