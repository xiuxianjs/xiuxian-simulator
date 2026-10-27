import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseMasterAction } from "../../../api/bot/master-actions.js";
import { caveRecoveryTips } from "../../caveRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/cavePlot/tendAll/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const text = (e.MessageText ?? "").trim().replace(/^[/#＃!！]/, "");
	const companion = text.startsWith("一键照料道侣灵田");
	const title = companion ? "一键照料道侣灵田" : "一键打理灵田";
	const quote = Format.createMarkdown();
	try {
		if (!(companion ? /^一键照料道侣灵田(?:\s+代收割)?$/ : /^一键打理灵田$/).test(text)) throw new Error(`使用方法：/${title}`);
		const loaded = await runRobotBusiness(e, companion ? "cave.companion-tend-all" : "cave.tend-all", { harvest: companion && text.endsWith(" 代收割") }, parseMasterAction, next);
		if (loaded.handled) return;
		loaded.data.message.split("\n").filter(Boolean).forEach((line) => quote.addText(line).addNewline());
		const operation = companion ? "cave.companion-tend-all" : "cave.tend-all";
		const lines = loaded.data.message.split("\n");
		const tips = lines.flatMap((line) => caveRecoveryTips(operation, line));
		if (lines.some((line) => /^(浇灌|除虫|除草|收割)：/.test(line) && !/^(浇灌|除虫|除草)：\d+ 项$/.test(line)) && !tips.length) tips.push(...caveRecoveryTips(operation, "操作失败，请稍后重试"));
		const uniqueTips = tips.filter((tip, index) => tips.findIndex((other) => other.command === tip.command && other.description === tip.description) === index);
		appendMiddlewareAdvice(quote, uniqueTips);
		if (companion && !text.endsWith(" 代收割") && !uniqueTips.length) addOptions(quote, [{
			label: "照料并代收割",
			command: "/一键照料道侣灵田 代收割"
		}]);
	} catch (error) {
		quote.addText(error instanceof Error ? error.message : "操作失败，请稍后重试").addNewline();
	}
	addOptions(quote, [{
		label: companion ? "我的道侣" : "我的灵田",
		command: companion ? "/我的道侣" : "/我的灵田"
	}]);
	const md = Format.createMarkdown().addBlockquote(quote);
	message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid: e.UserId,
		title: `【${title}】`,
		content: md
	}));
});

//#endregion
export { res_default as default };