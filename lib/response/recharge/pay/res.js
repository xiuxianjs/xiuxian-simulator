import { BackendAPIError } from "../../../api/bot/client.js";
import { requestRobotBusiness } from "../../../api/bot/robot-business.js";
import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { finishRobotBusiness, runRobotBusiness } from "../../robotBusiness.js";
import { renderCachedImage } from "../../../utils/imageRender.js";
import PayQrCode from "../../../img/views/PayQrCode.js";
import { CheckoutPromotionDecodeError } from "../../../api/bot/sponsor-payment.js";
import { NormalPackageListDecodeError, parseRobotNormalPaymentCreate, parseRobotNormalPaymentState } from "../../../api/bot/normal-payment.js";
import { buildRechargeSuccessContent } from "../paymentView.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";
import QRCode from "qrcode";

//#region src/response/recharge/pay/res.ts
/**
* 充值购买
* 指令：/充值购买 <套餐ID>
*/
const POLL_INTERVAL_MS = 1e4;
const TIMEOUT_MS = 3e5;
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = isPrivateEvent(e);
	if (!isPrivate) {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "充值购买",
			content: Format.createMarkdown().addText("充值购买仅支持私聊，请转到私聊后购买。"),
			bar: false
		}));
		return;
	}
	const [, parentNext] = useEvent();
	const feedback = async (text) => {
		await message.send(FormatGui({
			header: [{
				label: "返回权益",
				command: "/我的权益",
				autoEnter: false
			}, {
				label: "我的订单",
				command: "/我的订单",
				autoEnter: false
			}],
			isPrivate,
			bid,
			title: "充值购买",
			content: Format.createMarkdown().addText(text)
		}));
	};
	try {
		let created;
		try {
			const response = await runRobotBusiness(e, "normal.payment-create", {
				input: e.MessageText ?? "",
				private: isPrivate
			}, parseRobotNormalPaymentCreate, parentNext, (reply) => feedback(reply.text));
			if (response.handled) return;
			created = response.data;
		} catch (error) {
			if (error instanceof CheckoutPromotionDecodeError) {
				await message.send(FormatGui({
					isPrivate,
					bid,
					title: "原订单待核对",
					content: Format.createMarkdown().addBlockquote(createQuoteMarkdown([error.message], [{
						label: "查询原订单",
						command: `/查询充值订单 ${error.orderNo}`,
						autoEnter: false
					}, {
						label: "恢复原订单",
						command: `/继续支付 ${error.orderNo}`,
						autoEnter: false
					}])),
					footer: [{
						label: "我的订单",
						command: "/我的订单",
						autoEnter: false
					}]
				}));
				return;
			}
			await feedback(error instanceof NormalPackageListDecodeError ? "⚠️ 充值购买异常，请稍后重试" : `❌ ${error instanceof BackendAPIError ? error.message : "创建订单失败"}`);
			return;
		}
		if (created.kind === "packages") {
			const result = created;
			const md = Format.createMarkdown();
			for (const pkg of result.packages) {
				const quote = createQuoteMarkdown([`${pkg.name} · ¥${pkg.yuan}${pkg.doubleAvailable ? " · 首充双倍" : ""}`], [{
					label: "购买",
					command: `/充值购买 ${pkg.id}`,
					autoEnter: false
				}]);
				if (pkg.grantSpiritMilk > 0) quote.addNewline().addText(`道晶 ${pkg.grantSpiritMilk}`);
				md.addBlockquote(quote);
			}
			if (!result.packages.length) md.addText("暂无套餐上架");
			await message.send(FormatGui({
				header: [{
					label: "返回权益",
					command: "/我的权益",
					autoEnter: false
				}, {
					label: "我的订单",
					command: "/我的订单",
					autoEnter: false
				}],
				isPrivate,
				bid,
				title: "充值",
				content: md,
				footer: [{
					label: "全部套餐",
					command: "/充值",
					autoEnter: false
				}]
			}));
			return;
		}
		const checkout = created.checkout;
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
			footer: [{
				label: "返回权益",
				command: "/我的权益",
				autoEnter: false
			}]
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
			const md = Format.createMarkdown().addText(`订单已创建，但支付图片生成失败。订单号：${orderNo}，请从我的订单恢复支付页面。`);
			await message.send(FormatGui({
				header: [{
					label: "返回权益",
					command: "/我的权益",
					autoEnter: false
				}, {
					label: "我的订单",
					command: "/我的订单",
					autoEnter: false
				}],
				isPrivate,
				bid,
				title: "充值购买",
				content: md
			}));
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
							header: [{
								label: "返回权益",
								command: "/我的权益",
								autoEnter: false
							}, {
								label: "我的订单",
								command: "/我的订单",
								autoEnter: false
							}],
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
							header: [{
								label: "返回权益",
								command: "/我的权益",
								autoEnter: false
							}, {
								label: "我的订单",
								command: "/我的订单",
								autoEnter: false
							}],
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
	} catch (err) {
		logger.error("[Pay] 充值购买异常", err);
		const md = Format.createMarkdown().addText("⚠️ 充值购买异常，请稍后重试");
		await message.send(FormatGui({
			header: [{
				label: "返回权益",
				command: "/我的权益",
				autoEnter: false
			}, {
				label: "我的订单",
				command: "/我的订单",
				autoEnter: false
			}],
			isPrivate,
			bid,
			title: "充值购买",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };