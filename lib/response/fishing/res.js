import { createBackendReadRequestContext, createBackendRequestContext } from "../../api/bot/context.js";
import { isPrivateEvent } from "../../utils/privateEvent.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parseFishingView } from "../../api/bot/fishing.js";
import { parseBackendNormalCheckout } from "../../api/bot/sponsor-payment.js";
import { buildBubble } from "../presentation/bubble.js";
import { errorBubble } from "../presentation/presets.js";
import { selects } from "../config.js";
import { adviceRenderer } from "../feedbackRenderer.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { parseFishingCommand } from "./commands.js";
import { fishingBubble } from "./view.js";
import "../presentation/index.js";
import { Format, ResultCode, logger, onResponse, useEvent } from "alemonjs";

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
	const back = [{
		label: "返回垂钓",
		command: "/垂钓",
		autoEnter: false
	}];
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
			const result = await runRobotBusiness(event, parsed.operation, parsed.input, parseBackendNormalCheckout, next, void 0, createBackendRequestContext(event, parsed.operation));
			if (!result.handled) {
				const checkout = result.data;
				await send(FormatGui({
					bid: event.UserId,
					isPrivate: true,
					title: "垂钓 · 礼包支付",
					content: Format.createMarkdown().addText(checkout.packageName).addNewline().addText(`订单号：${checkout.order.orderNo}`).addNewline().addText(`金额：¥${(checkout.order.payAmount / 100).toFixed(2)}`).addNewline().addText("请完成原订单支付；结果不明时查询原订单，不重复购买。"),
					keyboard: [[{
						label: "打开支付页面",
						command: checkout.payUrl,
						type: "link",
						autoEnter: false
					}]],
					footer: [{
						label: "查询原订单",
						command: `/查询充值订单 ${checkout.order.orderNo}`,
						autoEnter: false
					}, {
						label: "返回礼包",
						command: "/垂钓 礼包",
						autoEnter: false
					}],
					bar: false
				}));
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
				footer: back,
				bar: false
			}));
		}), request);
		if (!result.handled) await send(fishingBubble(result.data, event));
	} catch (error) {
		logger.warn("[fishing] 垂钓请求或消息投递未确认", error);
		const original = parsed.operation === "fishing.confirm" ? parsed.input.ref : void 0;
		await send(errorBubble({
			bid: event.UserId,
			isPrivate: isPrivateEvent(event),
			title: "垂钓 · 结果待核对",
			reason: original ? "说明：原确认结果尚未核实，请重试同一引用或核对原操作；不要重新购买或重复扣料。" : "说明：请求暂未完成，请稍后重新查看；未取得原预览时不能确认。",
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