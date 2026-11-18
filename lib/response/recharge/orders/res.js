import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { getCommandBusinessErrorMessage } from "../../../utils/commandError.js";
import { requestBackend } from "../../../api/bot/client.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { CheckoutPromotionDecodeError, getBackendNormalPaymentSettlement, getBackendSponsorPayment, parseBackendNormalCheckout } from "../../../api/bot/sponsor-payment.js";
import { parseBackendRechargeRights } from "../../../api/bot/recharge-rights-queries.js";
import { selects } from "../../config.js";
import { trackFeatureOutcome } from "../../mwFeatureTrack.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { getPaymentOrders } from "../../../api/bot/payment-orders.js";
import { sendPaymentQr } from "../paymentQr.js";
import { buildRechargeSuccessContent } from "../paymentView.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/recharge/orders/res.ts
const statusText = (status) => ({
	PENDING: "待支付",
	PAID: "已支付，待发放",
	SUCCESS: "已完成",
	TIMEOUT: "支付入口已超时，关单及预留释放待确认",
	FAILED: "支付失败",
	CANCELLED: "已取消",
	REFUND: "已退款"
})[status] ?? `状态：${status}`;
const paymentEntryExpired = (order) => order.status === "PENDING" && typeof order.createdAt === "string" && Number.isFinite(Date.parse(order.createdAt)) && Date.now() - Date.parse(order.createdAt) >= 3e5;
const orderStatusText = (order) => {
	const resolutionText = {
		awaiting_payment: "已结束，额度已释放，可重新购买",
		closed: "已结束，额度已释放，可重新购买",
		refund_pending: "退款处理中，将原路退回，不再发奖",
		refunded: "已原路退款"
	};
	if (order.resolutionState && resolutionText[order.resolutionState]) return `状态：${resolutionText[order.resolutionState]}`;
	return paymentEntryExpired(order) ? "支付入口已过期，关单及预留释放待确认" : statusText(order.status);
};
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = isPrivateEvent(e);
	const footer = [{
		label: "返回权益",
		command: "/我的权益",
		autoEnter: false
	}, {
		label: "我的订单",
		command: "/我的订单",
		autoEnter: false
	}];
	const send = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的订单",
			content: Format.createMarkdown().addText(text),
			footer
		}));
	};
	if (!isPrivate) {
		await send("订单和支付详情仅支持私聊，请在私聊中发送 /我的订单。");
		return;
	}
	const startedAt = performance.now();
	let success = false;
	try {
		if ((await runRobotBusiness(e, "membership.rights", {}, parseBackendRechargeRights, next, (reply) => send(reply.text), void 0, void 0, false)).handled) return;
		const uid = e.uid;
		const input = e.MessageText.trim().replace(/^[/#＃!！]?/, "");
		const match = input.match(/^(查询充值订单|继续支付)\s+([A-Za-z0-9_-]{1,128})$/);
		if (/^(查询充值订单|继续支付)/.test(input)) {
			if (!match) {
				await send("请从订单列表选择原订单，或发送 /查询充值订单 订单号。");
				return;
			}
			const orderNo = match[2];
			const order = await getBackendSponsorPayment(bid, uid, orderNo);
			const md = Format.createMarkdown().addBlockquote(createQuoteMarkdown([
				`订单号：${order.orderNo}`,
				`金额：¥${(order.payAmount / 100).toFixed(2)}`,
				orderStatusText(order)
			], [{
				label: "刷新结果",
				command: `/查询充值订单 ${orderNo}`,
				autoEnter: false
			}, ...order.status === "PENDING" && !paymentEntryExpired(order) ? [{
				label: "继续支付",
				command: `/继续支付 ${orderNo}`,
				autoEnter: false
			}] : []]));
			if (order.status === "SUCCESS") try {
				md.addBlockquote(buildRechargeSuccessContent(await getBackendNormalPaymentSettlement(bid, uid, orderNo)));
			} catch {
				md.addNewline().addText("订单已完成，到账明细暂未获取，请查看权益与储物袋，或保留订单号联系运营。");
			}
			if (match[1] !== "继续支付" || order.status !== "PENDING" || !paymentEntryExpired(order)) await message.send(FormatGui({
				isPrivate,
				bid,
				title: "订单详情",
				content: md,
				footer
			}));
			if (match[1] === "继续支付" && order.status === "PENDING") {
				const checkout = parseBackendNormalCheckout(await requestBackend(bid, "get_players_id_payments_orders_orderNo_checkout", { path: {
					id: uid,
					orderNo
				} }));
				if (checkout.order.orderNo !== orderNo) throw new Error("原订单收银台回执不一致");
				const checkoutContent = Format.createMarkdown().addText(`商品：${checkout.packageName} · 原订单：${orderNo}`).addNewline().addText("说明：请使用下方支付二维码。");
				if (checkout.promotionTexts) checkoutContent.addNewline().addBlockquote(createQuoteMarkdown(["本订单返利参与说明", ...checkout.promotionTexts]));
				await message.send(FormatGui({
					isPrivate,
					bid,
					title: "继续支付",
					content: checkoutContent,
					footer
				}));
				try {
					await sendPaymentQr(message, checkout);
					success = true;
				} catch {
					await send(`原订单 ${orderNo} 的支付二维码未确认送达，请从我的订单重试。`);
				}
			} else success = match[1] === "查询充值订单";
			return;
		}
		const pageMatch = input.match(/^我的订单(?:\s+(\d+))?$/);
		const page = Number(pageMatch?.[1] ?? 1);
		if (!pageMatch || !Number.isSafeInteger(page) || page < 1) {
			await send("页码应为正整数，例如 /我的订单 1。");
			return;
		}
		const data = await getPaymentOrders(bid, uid, page);
		const totalPages = Math.max(1, Math.ceil(data.total / 5));
		if (page > totalPages) {
			await send(`订单共 ${totalPages} 页，请返回我的订单重新选择页码。`);
			return;
		}
		const md = Format.createMarkdown();
		if (!data.items.length) md.addText(data.total ? "本页没有订单，请返回上一页。" : "暂无订单，可从权益页选择需要的商品。");
		for (const order of data.items) md.addBlockquote(createQuoteMarkdown([order.orderNo, `¥${(order.payAmount / 100).toFixed(2)} · ${orderStatusText(order)}`], [{
			label: "查看结果",
			command: `/查询充值订单 ${order.orderNo}`
		}, ...order.status === "PENDING" && !paymentEntryExpired(order) ? [{
			label: "继续支付",
			command: `/继续支付 ${order.orderNo}`
		}] : []]));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的订单",
			content: md,
			nav: {
				current: page,
				total: totalPages,
				count: data.total,
				command: "/我的订单 {page}"
			},
			footer
		}));
		success = true;
	} catch (error) {
		logger.error("订单查询失败:", error);
		await send(error instanceof CheckoutPromotionDecodeError ? error.message : getCommandBusinessErrorMessage(error) ?? "订单信息暂未获取。请从我的订单查询原订单；本次操作不会重新创建订单。");
	} finally {
		trackFeatureOutcome(e, success, startedAt);
	}
});

//#endregion
export { res_default as default };