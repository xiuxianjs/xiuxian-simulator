import { createBackendRequestContext } from "../../../api/bot/context.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { parsePeiyuanConfirm } from "../../../api/bot/peiyuan-confirm.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { loadFinalBusiness } from "../../finalBusiness.js";
import App from "../../../response-apps/peiyuanDan/confirm/app.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/peiyuanDan/confirm/res.ts
/**
* 确认培元丹效果
* 指令：/确认培元丹
*/
var res_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const failure = (text) => sendMiddlewareReply(e, withBusinessRecovery("peiyuan.confirm", {
		title: "",
		heading: "",
		text,
		buttons: [],
		advice: []
	}));
	if (!/^[!！/#＃]?确认培元丹$/.test((e.MessageText ?? "").trim())) {
		await failure("参数错误：确认培元丹不接收额外参数，请先核对原预览。");
		return;
	}
	const business = await loadFinalBusiness(e, next, "peiyuan.confirm", {}, parsePeiyuanConfirm);
	if (business.handled) return;
	const result = await App({
		load: business.load,
		bid: String(e.UserId),
		uid: e.uid,
		request: createBackendRequestContext(e)
	});
	if (result.code === "CONFIRM_FAILED") {
		await failure("培元丹确认结果未获完整确认，请先核对属性、原预览与持有数量。");
		return;
	}
	const md = Format.createMarkdown();
	md.addText("✅ 培元丹确认已处理");
	md.addNewline();
	md.addNewline();
	if (result.data.changes.length > 0) {
		md.addText("原预览变化回执（当前属性以属性面板为准）：").addNewline();
		for (const c of result.data.changes) {
			const sign = c.change >= 0 ? `+${c.change}` : `${c.change}`;
			const icon = c.change > 0 ? "↑" : c.change < 0 ? "↓" : "—";
			md.addText(`${icon} ${c.attributeName}：${c.oldValue} → ${c.newValue}（${sign}）`);
			md.addNewline();
		}
	} else md.addText("本次没有属性变化；请核对属性面板，丹药不会因此返还。");
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [{
			label: "查看属性",
			command: "/属性面板"
		}, ...result.data.changes.length ? [{
			label: "继续服用",
			command: "/服用 培元丹 1"
		}] : []]
	}));
});

//#endregion
export { res_default as default };