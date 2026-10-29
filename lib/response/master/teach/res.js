import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseMasterTargetAction } from "../../../api/bot/master-actions.js";
import { masterRecoveryTips } from "../../masterRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { masterMentionBid, parseTeachMasterCommand } from "../../../utils/masterCommand.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/master/teach/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const parsed = parseTeachMasterCommand(e.MessageText || "");
	const targetBid = await masterMentionBid(mention);
	let data;
	try {
		const loaded = await runRobotBusiness(e, "master.teach", {
			targetArg: parsed ?? "",
			...targetBid ? { targetBid } : {}
		}, (value) => parseMasterTargetAction(value, "传功"), next);
		if (loaded.handled) return;
		data = loaded.data;
	} catch (error) {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "操作失败")
		}));
		return;
	}
	if (data.outcome === "usage") {
		const md = Format.createMarkdown();
		md.addText("使用方法：传功 <徒弟UID|@目标>");
		appendMiddlewareAdvice(md, masterRecoveryTips("master.teach", "使用方法：传功"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "【传功】",
			content: md
		}));
		return;
	}
	const md = Format.createMarkdown();
	if (data.message.includes("\n")) data.message.split("\n").filter(Boolean).forEach((line) => md.addText(line).addNewline());
	else md.addText(data.message);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };