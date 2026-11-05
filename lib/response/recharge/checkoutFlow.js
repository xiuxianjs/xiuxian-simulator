import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { requestRobotBusiness } from "../../api/bot/robot-business.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { finishRobotBusiness } from "../robotBusiness.js";
import { renderCachedImage } from "../../utils/imageRender.js";
import PayQrCode from "../../img/views/PayQrCode.js";
import { parseRobotNormalPaymentState } from "../../api/bot/normal-payment.js";
import { buildRechargeSuccessContent } from "./paymentView.js";
import { Format, ResultCode, logger } from "alemonjs";
import QRCode from "qrcode";

//#region src/response/recharge/checkoutFlow.ts
const POLL_INTERVAL_MS = 1e4;
const TIMEOUT_MS = 3e5;
/** One checkout/QR/poll path for normal, daily and fishing packs. */
async function presentPaymentCheckout(e, checkout, parentNext, feedback, navigation = [{
	label: "返回权益",
	command: "/我的权益",
	autoEnter: false
}, {
	label: "我的订单",
	command: "/我的订单",
	autoEnter: false
}]) {
	const [client] = useMessage$1();
	const message = { send: async (body) => {
		const receipts = await client.send(body);
		if (!receipts.length || receipts.some((receipt) => receipt.code !== ResultCode.Ok)) throw new Error("支付消息未确认送达");
		return receipts;
	} };
	const bid = e.UserId;
	const isPrivate = true;
	const { orderNo } = checkout.order;
	const { packageName } = checkout;
	const yuan = (checkout.order.payAmount / 100).toFixed(2);
	await message.send(FormatGui({
		isPrivate,
		bid,
		title: "订单待支付",
		keyboard: [[{
			label: "打开支付页面",
			command: checkout.payUrl,
			type: "link",
			autoEnter: false
		}]],
		content: Format.createMarkdown().addBlockquote(createQuoteMarkdown([
			`商品：${packageName}`,
			`金额：¥${yuan}`,
			`订单号：${orderNo}`,
			...checkout.promotionTexts ? ["本订单返利参与说明", ...checkout.promotionTexts] : []
		], [{
			label: "查询支付结果",
			command: `/查询充值订单 ${orderNo}`,
			autoEnter: false
		}, {
			label: "恢复支付页面",
			command: `/继续支付 ${orderNo}`,
			autoEnter: false
		}])),
		footer: navigation
	}));
	let qrCodeBuffer;
	try {
		qrCodeBuffer = await QRCode.toBuffer(checkout.payUrl, {
			width: 300,
			margin: 1
		});
	} catch {
		await feedback(`订单已创建，但二维码生成失败。订单号：${orderNo}，请从我的订单恢复支付页面。`);
		return;
	}
	const qrCodeDataUrl = `data:image/png;base64,${qrCodeBuffer.toString("base64")}`;
	const payImg = await renderCachedImage(PayQrCode, {
		qrCodeDataUrl,
		packageName,
		yuan,
		orderNo,
		theme: "default"
	}, "panel:recharge:pay");
	if (!payImg || typeof payImg === "boolean") {
		await feedback(`订单已创建，但支付图片生成失败。订单号：${orderNo}，请从我的订单恢复支付页面。`);
		return;
	}
	const payFormat = Format.create();
	payFormat.addImage(payImg);
	await message.send({ format: payFormat });
	let pollCount = 0;
	const maxPolls = Math.ceil(TIMEOUT_MS / POLL_INTERVAL_MS);
	let processing = false;
	const pollTimer = setInterval(() => {
		pollCount++;
		(async () => {
			if (processing) return;
			processing = true;
			try {
				const raw = await requestRobotBusiness(e, pollCount >= maxPolls ? "normal.payment-timeout" : "normal.payment-state", { orderNo }, parseRobotNormalPaymentState);
				if (!raw.success || raw.branch === "middleware") clearInterval(pollTimer);
				const response = await finishRobotBusiness(e, raw, parentNext, (reply) => feedback(reply.text), false);
				if (response.handled) return;
				const { order, receipt, timedOut, cancelled } = response.data;
				if (order.status === "SUCCESS") {
					clearInterval(pollTimer);
					await message.send(FormatGui({
						header: navigation,
						isPrivate,
						bid,
						title: "充值成功",
						content: Format.createMarkdown().addBlockquote(buildRechargeSuccessContent(receipt)),
						footer: [{
							label: "我的资料",
							command: "/我的资料",
							autoEnter: false
						}, {
							label: "储物袋",
							command: "/储物袋",
							autoEnter: false
						}]
					}));
					return;
				}
				if (order.status !== "PENDING" && order.status !== "PAID") {
					clearInterval(pollTimer);
					await feedback(`订单状态：${order.status}，可在我的订单中查看详情。`);
					return;
				}
				if (timedOut) {
					clearInterval(pollTimer);
					const md = Format.createMarkdown().addText(cancelled ? "支付等待超时，服务端已关闭待支付订单。如已付款，请保留订单号并查询原订单。" : order.status === "PAID" ? "订单已支付，奖励仍在处理中，请查询原订单确认到账。" : "自动查询已结束，订单关闭结果尚未确认，请查询原订单。");
					await message.send(FormatGui({
						header: navigation,
						isPrivate,
						bid,
						title: "充值购买",
						content: md
					}));
				}
			} catch (err) {
				logger.error(`[Pay] 轮询支付状态异常: orderNo=${orderNo}`, err);
				if (pollCount >= maxPolls) {
					clearInterval(pollTimer);
					await feedback(`自动查询已结束，支付结果暂未确认。请在我的订单查询原订单 ${orderNo}。`);
				}
			} finally {
				processing = false;
			}
		})();
	}, POLL_INTERVAL_MS);
}

//#endregion
export { presentPaymentCheckout };