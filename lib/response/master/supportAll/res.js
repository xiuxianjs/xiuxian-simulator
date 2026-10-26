import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { masterRecoveryTips } from "../../masterRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/master/supportAll/res.ts
function parseSupport(value) {
	const data = value;
	if (!data || typeof data.message !== "string" || typeof data.plan !== "string" || typeof data.canConfirm !== "boolean" || data.canConfirm && !/^[a-f0-9]{64}$/.test(data.plan)) throw new Error("师门扶持响应不完整");
	return {
		message: data.message,
		plan: data.plan,
		canConfirm: data.canConfirm
	};
}
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const text = (e.MessageText ?? "").trim().replace(/^[/#＃!！]/, "");
	const match = text.match(/^一键(赐福|赐丹)(?:\s+确认\s+([a-f0-9]{64}))?$/);
	const label = text.startsWith("一键赐丹") ? "赐丹" : "赐福";
	const quote = Format.createMarkdown();
	const operation = label === "赐福" ? "master.bless-all" : "master.gift-all";
	try {
		if (!match) throw new Error(`使用方法：/一键${label}，先预览丹药消耗，再点击确认`);
		const loaded = await runRobotBusiness(e, operation, { plan: match[2] ?? "" }, parseSupport, next);
		if (loaded.handled) return;
		loaded.data.message.split("\n").filter(Boolean).forEach((line) => quote.addText(line).addNewline());
		appendMiddlewareAdvice(quote, masterRecoveryTips(operation, loaded.data.message));
		if (!match[2] && loaded.data.canConfirm) addOptions(quote, [{
			label: `确认${label}`,
			command: `/一键${label} 确认 ${loaded.data.plan}`
		}]);
	} catch (error) {
		const text = error instanceof Error ? error.message : "操作失败，请稍后重试";
		quote.addText(text).addNewline();
		appendMiddlewareAdvice(quote, masterRecoveryTips(operation, match?.[2] ? "批量执行未获完整确认" : text));
	}
	addOptions(quote, [{
		label: "我的师门",
		command: "/我的师门"
	}]);
	const md = Format.createMarkdown().addBlockquote(quote);
	message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid: e.UserId,
		title: `【一键${label}】`,
		content: md
	}));
});

//#endregion
export { res_default as default };