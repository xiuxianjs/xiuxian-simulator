import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotCompanionBreakup } from "../../../api/bot/companion-actions-robot.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/companion/breakup/res.ts
/**
* 解除道侣指令
* - /解除道侣          → 提示再次发送带「确认」的指令完成解除
* - /解除道侣 确认     → 直接执行解除
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const rawText = (e.MessageText ?? "").trim();
	const confirmed = /^[!！/#＃]?解除道侣\s+确认$/.test(rawText);
	const [, next] = useEvent();
	const response = await runRobotBusiness(e, "companion.breakup", { confirmed }, parseRobotCompanionBreakup, next, async (reply) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: reply.title,
			content: Format.createMarkdown().addText(reply.text),
			footer: reply.buttons.length ? reply.buttons : void 0
		}));
	});
	if (response.handled) return;
	const result = response.data;
	if (result.mode === "preview") {
		const { partnerName } = result;
		const md = Format.createMarkdown();
		md.addText(`确定要与「${partnerName}」解除道侣关系吗？`);
		md.addNewline();
		md.addText("解除后将降为普通好友，灵契值保留。");
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "确认解除",
				command: "/解除道侣 确认"
			}]
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText(result.message);
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(result.narrativeText));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };