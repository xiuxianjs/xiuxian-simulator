import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotCompanionRejection } from "../../../api/bot/companion-actions-robot.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/companion/reject/res.ts
/**
* 拒绝道侣申请指令
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const text = e.MessageText?.trim() ?? "";
	const match = text.match(/^[!！/#＃]?拒绝道侣\s+(.+)$/);
	const [, next] = useEvent();
	if (!/^[!！/#＃]?拒绝道侣(?:\s+.+)?$/.test(text)) return next();
	const response = await runRobotBusiness(e, "companion.reject", { name: match?.[1]?.trim() ?? "" }, parseRobotCompanionRejection, next, async (reply) => {
		const md = Format.createMarkdown();
		if (reply.heading) md.addBold(reply.heading).addNewline();
		md.addText(reply.text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: reply.title,
			content: md,
			footer: reply.buttons.length ? reply.buttons : void 0
		}));
	});
	if (response.handled) return;
	const result = response.data;
	const md = Format.createMarkdown();
	const repeatMsg = result.message;
	md.addText(repeatMsg);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };