import { SDKError } from "../../api/core/error.js";
import { createBackendReadRequestContext, createBackendRequestContext } from "../../api/bot/context.js";
import { isPrivateEvent } from "../../utils/privateEvent.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parseFishingView } from "../../api/bot/fishing.js";
import { parseBackendNormalCheckout } from "../../api/bot/sponsor-payment.js";
import { buildBubble } from "../presentation/bubble.js";
import { errorBubble } from "../presentation/presets.js";
import "../presentation/index.js";
import { selects } from "../config.js";
import { adviceRenderer } from "../feedbackRenderer.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { isFishingInventoryCommand, parseFishingCommand } from "./commands.js";
import { fishingBubble } from "./view.js";
import { presentPaymentCheckout } from "../recharge/checkoutFlow.js";
import { ResultCode, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/fishing/res.ts
var res_default = onResponse(selects, async (event) => {
	const [, next] = useEvent();
	const parsed = parseFishingCommand(event.MessageText ?? "");
	if (parsed === void 0) {
		next();
		return;
	}
	const [message] = useMessage$1();
	const send = async (body) => {
		const receipts = await message.send(body);
		if (!receipts.length || receipts.some((receipt) => receipt.code !== ResultCode.Ok)) throw new Error("垂钓消息未确认送达");
	};
	const back = isFishingInventoryCommand(event.MessageText ?? "") ? [{
		label: "返回渔获",
		command: "/储物袋 渔获",
		autoEnter: false
	}] : [{
		label: "返回垂钓",
		command: "/垂钓",
		autoEnter: false
	}];
	let checkoutOrderNo;
	const recoverCheckout = () => send(errorBubble({
		bid: event.UserId,
		isPrivate: isPrivateEvent(event),
		title: "垂钓 · 原订单待核对",
		reason: checkoutOrderNo ? `原订单 ${checkoutOrderNo} 的支付信息暂未核实，请查询或恢复此订单，不要重复购买。` : "支付请求结果尚未确认，请先在我的订单核对；如已有订单请继续原订单，不要重复购买。",
		actions: checkoutOrderNo ? [{
			label: "查询原订单",
			command: `/查询充值订单 ${checkoutOrderNo}`,
			autoEnter: false
		}, {
			label: "恢复原订单",
			command: `/继续支付 ${checkoutOrderNo}`,
			autoEnter: false
		}] : [{
			label: "我的订单",
			command: "/我的订单",
			autoEnter: false
		}],
		footer: [{
			label: "返回礼包",
			command: "/垂钓 礼包",
			autoEnter: false
		}]
	}));
	if ("error" in parsed) {
		await send(errorBubble({
			bid: event.UserId,
			isPrivate: isPrivateEvent(event),
			title: "垂钓 · 未完成",
			reason: `说明：${parsed.error}`,
			footer: back
		}));
		return;
	}
	try {
		if (parsed.operation === "fishing.pack-checkout") {
			if (!isPrivateEvent(event)) {
				await send(errorBubble({
					bid: event.UserId,
					isPrivate: false,
					title: "垂钓 · 礼包支付",
					reason: "订单及支付详情仅支持私聊，请在私聊中购买。",
					footer: back
				}));
				return;
			}
			const result = await runRobotBusiness(event, parsed.operation, parsed.input, (value) => {
				const order = value && typeof value === "object" ? value.order : void 0;
				if (typeof order?.orderNo === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(order.orderNo)) checkoutOrderNo = order.orderNo;
				return parseBackendNormalCheckout(value);
			}, next, void 0, createBackendRequestContext(event, parsed.operation), async (error) => {
				const details = error instanceof SDKError && error.details && typeof error.details === "object" ? error.details : void 0;
				if (details?.recoverable !== true || typeof details.orderNo !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(details.orderNo)) return false;
				checkoutOrderNo = details.orderNo;
				await recoverCheckout();
				return true;
			});
			if (!result.handled) {
				const checkout = result.data;
				const navigation = [{
					label: "返回礼包",
					command: "/垂钓 礼包",
					autoEnter: false
				}, {
					label: "我的订单",
					command: "/我的订单",
					autoEnter: false
				}];
				await presentPaymentCheckout(event, checkout, next, async (text) => {
					await send(buildBubble({
						bid: event.UserId,
						isPrivate: true,
						title: "垂钓 · 原订单待核对",
						sections: [{
							lines: [text],
							actions: [{
								label: "查询原订单",
								command: `/查询充值订单 ${checkout.order.orderNo}`,
								autoEnter: false
							}, {
								label: "恢复原订单",
								command: `/继续支付 ${checkout.order.orderNo}`,
								autoEnter: false
							}]
						}],
						footer: navigation
					}));
				}, navigation);
			}
			return;
		}
		const request = parsed.operation === "fishing.query" ? createBackendReadRequestContext() : createBackendRequestContext(event, parsed.operation);
		const result = await runRobotBusiness(event, parsed.operation, parsed.input, parseFishingView, next, adviceRenderer(async (reply) => {
			const actions = (buttons) => buttons.map((button) => ({
				...button,
				autoEnter: false
			}));
			const sections = [{
				lines: [
					reply.heading,
					reply.text,
					reply.quote ?? "",
					...reply.rawLines ?? []
				].filter(Boolean),
				actions: actions(reply.buttons)
			}];
			for (const block of reply.blocks ?? []) sections.push({
				lines: [block.text],
				actions: actions(block.inlineButtons ?? [])
			});
			for (const tip of reply.advice) sections.push({
				lines: [tip.description],
				actions: actions([{
					label: tip.command,
					command: tip.command
				}])
			});
			await send(buildBubble({
				bid: event.UserId,
				isPrivate: isPrivateEvent(event),
				title: reply.title || "垂钓 · 未完成",
				sections,
				footer: back
			}));
		}), request, async (error) => {
			if (parsed.operation !== "fishing.query" || parsed.input.view !== "boss" && parsed.input.view !== "boss-drops" || !(error instanceof SDKError) || error.status !== 404 || error.code !== "NOT_FOUND") return false;
			await send(buildBubble({
				bid: event.UserId,
				isPrivate: isPrivateEvent(event),
				title: "洞府垂钓",
				sections: [{ lines: [error.message] }],
				footer: back
			}));
			return true;
		});
		if (!result.handled) await send(fishingBubble(result.data, event));
	} catch (error) {
		logger.warn("[fishing] 垂钓请求或消息投递未确认", error);
		if (parsed.operation === "fishing.pack-checkout") {
			await recoverCheckout();
			return;
		}
		const original = parsed.operation === "fishing.confirm" ? parsed.input.ref : void 0;
		await send(errorBubble({
			bid: event.UserId,
			isPrivate: isPrivateEvent(event),
			title: "垂钓 · 结果待核对",
			reason: original ? "说明：原确认结果尚未核实，请重试同一引用或核对原操作；不要重新购买或重复扣料。" : parsed.operation === "fishing.contest-claim" ? "说明：周赛领奖结果尚未核实，请查看该周原奖励状态，不要重新计算或重复领取。" : parsed.operation === "fishing.start-current" ? "说明：开钓结果尚未核实，请先查看当前垂钓状态，不要重复开始。" : parsed.operation === "fishing.stop-current" ? "说明：收杆结果尚未核实，请先查看当前垂钓状态，不要重复操作。" : parsed.operation === "fishing.configure" ? "说明：设置或打窝结果尚未核实，请先查看当前设置与窝料状态，不要重复操作。" : parsed.operation === "fishing.purchase" ? "说明：购买结果尚未核实，请先核对余额与已有物资，不要重复购买。" : "说明：请求暂未完成，请稍后重新查看；未取得原预览时不能确认。",
			actions: original ? [{
				label: "重试原确认",
				command: `/垂钓 确认 ${original}`,
				autoEnter: false
			}] : void 0,
			footer: back
		}));
	}
});

//#endregion
export { res_default as default };