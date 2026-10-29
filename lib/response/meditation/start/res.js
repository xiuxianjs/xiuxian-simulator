import { getCommandErrorMessage } from "../../../utils/commandError.js";
import { createBackendRequestContext } from "../../../api/bot/context.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseMeditationBoostOptions, parseMeditationStart } from "../../../api/bot/meditation.js";
import "../../../api/index.js";
import { selects } from "../../config.js";
import { loadFinalBusiness } from "../../finalBusiness.js";
import App from "../../../response-apps/meditation/start/app.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/meditation/start/res.ts
/**
* 闭关指令处理器
* 指令：/闭关
*
* - 未闭关时：开始闭关
* - 已闭关时：查看闭关进度
*/
var res_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const rawText = (e.MessageText ?? "").trim();
	const boostMatch = rawText.match(/^(?:[!！/#＃])?闭关\s+灵石\s+(\d+)$/);
	if (boostMatch || /^(?:[!！/#＃])?(?:闭关|打坐)加速$/.test(rawText)) {
		const options = await loadFinalBusiness(e, next, "meditation.boost-options", {}, parseMeditationBoostOptions);
		if (options.handled) return;
		let data;
		try {
			data = await options.load();
		} catch (error) {
			logger.error("[闭关加速] 错误:", {
				requestId: createBackendRequestContext(e)?.requestId,
				error
			});
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "闭关灵石加速",
				content: Format.createMarkdown().addText(getCommandErrorMessage(error))
			}));
			return;
		}
		const quote = Format.createMarkdown().addText(`闭关灵石加速：${data.autoEnabled ? "开启" : "关闭"}`);
		quote.addNewline().addText(`开启后自动提升修为与真气效率至×${data.multiplier}，每15分钟${data.pricePerInterval}灵石。`);
		quote.addNewline().addText("出关时按可用灵石结算，余额不足的部分按普通修炼计算，无需购买时长。");
		if (!data.enabled) quote.addNewline().addText("灵石加速暂不可用，仍可普通闭关。");
		quote.addNewline().addButton(markdownButtonLabel(data.autoEnabled ? "关闭加速" : "开启加速"), { data: `/配置闭关自动加速 ${data.autoEnabled ? "关闭" : "开启"}` });
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "闭关灵石加速",
			content: Format.createMarkdown().addBlockquote(quote),
			footer: [{
				label: "闭关",
				command: "/闭关"
			}, {
				label: "我的设置",
				command: "/我的设置"
			}]
		}));
		return;
	}
	const legacyDestination = (e.MessageText ?? "").trim().match(/^(?:[!！/#＃])?闭关\s+(.+)$/)?.[1]?.trim();
	if (legacyDestination && !boostMatch) {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "探索秘境",
			content: Format.createMarkdown().addText("整装出发，前往秘境。"),
			footer: [{
				label: "前往秘境",
				command: `/探索秘境 ${legacyDestination}`
			}]
		}));
		return;
	}
	const business = await loadFinalBusiness(e, next, "meditation.start", { boostHours: Number(boostMatch?.[1] ?? 0) }, parseMeditationStart);
	if (business.handled) return;
	const uid = e.uid;
	const result = await App({
		load: business.load,
		uid,
		bid,
		messageText: e.MessageText,
		request: createBackendRequestContext(e)
	});
	if (result.code === "LOAD_FAILED") {
		const md = Format.createMarkdown();
		md.addText(result.data.message);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "闭关修炼",
			content: md
		}));
		return;
	}
	const { data } = result;
	if (!data.success) {
		const repeatMsg = data.message;
		const md = Format.createMarkdown();
		if (data.button && data.buttonText) md.addBlockquote(Format.createMarkdown().addText(`❌ ${repeatMsg} `).addButton(markdownButtonLabel(data.buttonText), { data: data.button }));
		else md.addText(`❌ ${repeatMsg}`);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "闭关修炼",
			content: md,
			footer: [{
				label: "出关",
				command: "/出关"
			}, {
				label: "灵石加速",
				command: "/闭关加速"
			}]
		}));
		return;
	}
	const accelerated = data.boost?.enabled === true;
	const quote = Format.createMarkdown();
	quote.addText(`已修炼 ${data.elapsedText}`).addNewline();
	quote.addText(`当前可领取：修为${data.expSoFar ?? 0} · 真气${data.qiSoFar ?? 0}`);
	const bonuses = [...data.bonusLines ?? []];
	if (accelerated) bonuses.unshift(`灵石加速：修为与真气效率×${data.boost?.multiplier}`);
	if (bonuses.length) {
		quote.addNewline().addNewline().addText("本轮加成：");
		for (const line of bonuses) quote.addNewline().addText(`· ${line}`);
	}
	if (data.boost) quote.addNewline().addNewline().addText(`本次加速费用：${data.boost.estimatedCharge ?? 0}灵石`);
	quote.addNewline().addButton(markdownButtonLabel("出关领取"), { data: "/出关" });
	await message.send(FormatGui({
		isPrivate,
		bid,
		title: accelerated ? "闭关中 · 灵石加速" : "闭关中",
		content: Format.createMarkdown().addBlockquote(quote)
	}));
});

//#endregion
export { res_default as default };