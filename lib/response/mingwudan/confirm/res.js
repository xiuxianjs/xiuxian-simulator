import { createBackendRequestContext } from "../../../api/bot/context.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { EMPTY_STRING, FIRST_ARG_INDEX, SECOND_ARG_INDEX } from "../../../constants/common.js";
import "../../../constants/index.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { loadFinalBusiness } from "../../finalBusiness.js";
import App from "../../../response-apps/mingwudan/confirm/app.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/mingwudan/confirm/res.ts
/**
* 确认明悟丹服用指令处理器
* 指令格式: /确认明悟丹 {功法模板ID} {数量}
*/
const response = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const messageText = (e.MessageText || "").trim().replace(/^(!|！|\/|#|＃)?确认明悟丹\s*/, "").trim();
	const args = messageText ? messageText.split(/\s+/) : [];
	const skillBookIdStr = args[0];
	const quantityStr = args[1] ?? "1";
	const failure = (text) => sendMiddlewareReply(e, withBusinessRecovery("mingwu.confirm", {
		title: "明悟丹参悟",
		heading: "",
		text,
		buttons: [],
		advice: []
	}));
	if (args.length > 2 || skillBookIdStr !== void 0 && (!/^\d+$/.test(skillBookIdStr) || !Number.isSafeInteger(Number(skillBookIdStr))) || !/^\d+$/.test(quantityStr) || !Number.isSafeInteger(Number(quantityStr))) {
		await failure("参数错误：明悟丹选择编号与数量必须为完整整数，不接受小数、尾部文字或多余参数。");
		return;
	}
	if (!skillBookIdStr || isNaN(parseInt(skillBookIdStr, 10)) || parseInt(skillBookIdStr, 10) <= 0 || isNaN(parseInt(quantityStr, 10)) || parseInt(quantityStr, 10) < 1) {
		if ((await loadFinalBusiness(e, next, "mingwu.confirm", { mode: "usage" }, (value) => value)).handled) return;
	}
	if (!skillBookIdStr || skillBookIdStr === "") {
		const md = Format.createMarkdown();
		md.addText("请选择要参悟的功法。").addNewline().addButton(markdownButtonLabel("选择功法"), { data: "/服用 明悟丹 1" });
		appendMiddlewareAdvice(md, withBusinessRecovery("mingwu.confirm", {
			title: "",
			heading: "",
			text: "参数错误",
			buttons: [],
			advice: []
		}).advice);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "明悟丹参悟",
			content: md
		}));
		return;
	}
	const skillBookId = parseInt(skillBookIdStr, 10);
	const quantity = parseInt(quantityStr, 10);
	if (isNaN(skillBookId) || skillBookId <= 0) {
		const md = Format.createMarkdown();
		md.addText("❌ 功法模板ID无效");
		appendMiddlewareAdvice(md, withBusinessRecovery("mingwu.confirm", {
			title: "",
			heading: "",
			text: "参数错误",
			buttons: [],
			advice: []
		}).advice);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "明悟丹参悟",
			content: md
		}));
		return;
	}
	if (isNaN(quantity) || quantity < 1) {
		const md = Format.createMarkdown();
		md.addText("❌ 数量必须是大于0的整数");
		appendMiddlewareAdvice(md, withBusinessRecovery("mingwu.confirm", {
			title: "",
			heading: "",
			text: "参数错误",
			buttons: [],
			advice: []
		}).advice);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "明悟丹参悟",
			content: md
		}));
		return;
	}
	const business = await loadFinalBusiness(e, next, "mingwu.confirm", {
		skillBookId,
		quantity
	}, (value) => value);
	if (business.handled) return;
	const uid = e.uid;
	const result = await App({
		load: business.load,
		bid: String(e.UserId),
		uid,
		skillBookId,
		quantity,
		messageText: e.MessageText,
		request: createBackendRequestContext(e)
	});
	if (result.code === "INVALID_USER") {
		const md = Format.createMarkdown();
		md.addText(result.message);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "明悟丹参悟",
			content: md
		}));
		return;
	}
	if (result.code === "FAILED") {
		await failure("明悟丹使用结果未获完整确认，请先核对功法、丹药与原回执。");
		return;
	}
	if (result.code === "INVALID_PARAM" || result.code === "NOT_FOUND") {
		const md = Format.createMarkdown();
		const recovery = withBusinessRecovery("mingwu.confirm", {
			title: "明悟丹参悟",
			heading: "",
			text: `❌ ${result.message}`,
			buttons: [],
			advice: []
		});
		md.addText(recovery.text);
		appendMiddlewareAdvice(md, recovery.advice);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "明悟丹参悟",
			content: md,
			footer: recovery.buttons.length ? recovery.buttons : void 0
		}));
		return;
	}
	if (result.code === "OK") {
		const md = Format.createMarkdown();
		const data = result.data;
		md.addText("💊 明悟丹参悟");
		md.addNewline();
		md.addNewline();
		if (data.proficiencyGain > 0) md.addText(`✨ ${data.message}`);
		else if (data.proficiencyGain === 0) md.addText(`😔 ${data.message}`);
		else md.addText(data.message);
		md.addNewline();
		md.addNewline();
		md.addText(`📖 功法：${data.skillBookName}`);
		md.addNewline();
		md.addText(`当前熟练度：${data.currentProficiency}%`);
		md.addNewline();
		md.addText(`本次消耗：明悟丹×${data.consumedCount}`);
		md.addNewline();
		md.addText(`今日剩余：${data.remainingCount}次`);
		md.addNewline();
		md.addText(data.guidanceText);
		if (data.canContinue && (data.currentProficiency >= 60 || data.remainingCount < quantity || data.consumedCount < quantity)) {
			md.addNewline().addText("本次条件已变化，请先核对熟练度、实际用量和剩余次数，再从当前选择面板决定下一次用量。");
			appendMiddlewareAdvice(md, withBusinessRecovery("mingwu.confirm", {
				title: "",
				heading: "",
				text: "核对当前选择",
				buttons: [],
				advice: []
			}).advice);
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "明悟丹参悟",
			content: md,
			footer: data.canContinue && data.currentProficiency < 60 && data.remainingCount >= quantity && data.consumedCount === quantity ? [{
				label: "继续服用",
				command: `/确认明悟丹 ${skillBookId} ${quantity}`
			}] : void 0
		}));
	}
});

//#endregion
export { response as default };