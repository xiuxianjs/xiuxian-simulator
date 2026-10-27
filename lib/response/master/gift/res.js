import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { masterMentionBid, parseMasterGiftCommand } from "../../../utils/masterCommand.js";
import { masterRecoveryTips } from "../../masterRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseMasterTargetAction } from "../../../api/bot/master-actions.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/master/gift/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const parsed = parseMasterGiftCommand(e.MessageText || "");
	const targetBid = await masterMentionBid(mention);
	let data;
	try {
		const loaded = await runRobotBusiness(e, "master.gift", {
			targetArg: parsed?.discipleArg ?? "",
			...targetBid ? { targetBid } : {},
			...parsed?.pillType ? { itemKey: parsed.pillType } : {}
		}, (value) => parseMasterTargetAction(value, "赐丹"), next);
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
		md.addText("使用方法：赐丹 <徒弟UID|@目标> [培元丹|筑基丹]");
		appendMiddlewareAdvice(md, masterRecoveryTips("master.gift", "使用方法：赐丹"));
		md.addNewline();
		md.addText("默认：练气徒弟优先筑基丹×1，筑基及以上徒弟默认培元丹×2");
		md.addNewline();
		md.addText("可选：手动指定培元丹×2或筑基丹×1");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "【赐丹】",
			content: md
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText(data.message);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };