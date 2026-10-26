import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { emailRecoveryTips } from "../../emailRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { emailActionArguments, emailDeleteDecoder } from "../../../api/bot/email-actions-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/email/deleteEmail/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const id = e.MessageText.replace(/^(!|！|\/|#|＃)?删除邮件/, "").trim();
	const [, next] = useEvent();
	const args = emailActionArguments(e.MessageText, "删除邮件");
	const feedback = adviceRenderer((reply) => sendMiddlewareReply(e, {
		...reply,
		title: "删除邮件"
	}));
	const loaded = await runRobotBusiness(e, "emails.delete", args, emailDeleteDecoder(args.emailId ?? NaN), next, feedback).catch(async () => {
		await sendMiddlewareReply(e, {
			title: "删除邮件",
			heading: "",
			text: "删除结果未获完整确认，请先查看邮件状态",
			buttons: [],
			advice: emailRecoveryTips("emails.delete", "删除未确认")
		});
		return { handled: true };
	});
	if (loaded.handled) return;
	const result = loaded.data;
	if (result.code === "CONFIRM") {
		const md = Format.createMarkdown();
		md.addBlockquote(Format.createMarkdown().addText(`删除邮件 ${id} · ${result.expiresInSeconds}秒内有效 `).addButton(markdownButtonLabel("确认删除"), { data: `/删除邮件 ${id}` }));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "删除邮件",
			content: md
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText("删除完成");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "删除邮件",
		content: md
	}));
});

//#endregion
export { res_default as default };