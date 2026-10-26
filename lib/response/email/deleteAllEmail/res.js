import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { emailRecoveryTips } from "../../emailRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseEmailDeleteAll } from "../../../api/bot/email-delete-all.js";
import "../../../api/bot/email-actions-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/email/deleteAllEmail/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const render = async (result) => {
		const md = Format.createMarkdown();
		if (result.code === "EMPTY") {
			md.addText(result.displayMsg);
			md.addNewline();
			md.addBlockquote(Format.createMarkdown().addText("仅可删除：已读无附件 或 已领取的邮件"));
		} else md.addText(`成功删除 ${result.deleted} 封邮件！`);
		md.addNewline();
		md.addButton(markdownButtonLabel("返回邮件列表"), { data: "/我的邮件" });
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "一键删除邮件",
			content: md
		}));
	};
	const loaded = await runRobotBusiness(e, "emails.delete-all", {}, parseEmailDeleteAll, next, adviceRenderer(async (reply) => {
		await sendMiddlewareReply(e, {
			...reply,
			title: "一键删除邮件"
		});
	})).catch(async () => {
		await sendMiddlewareReply(e, {
			title: "一键删除邮件",
			heading: "",
			text: "删除结果未获完整确认，请先查看邮件状态",
			buttons: [],
			advice: emailRecoveryTips("emails.delete-all", "删除未确认")
		});
		return { handled: true };
	});
	if (!loaded.handled) await render({
		code: "DELETED",
		deleted: loaded.data.deleted
	});
});

//#endregion
export { res_default as default };