import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { emailRecoveryTips } from "../../emailRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { emailActionArguments, emailClaimDecoder } from "../../../api/bot/email-actions-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/email/receiveEmail/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e.UserId, isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const args = emailActionArguments(e.MessageText, "领取邮件");
	const feedback = adviceRenderer((reply) => sendMiddlewareReply(e, {
		...reply,
		title: "领取邮件"
	}));
	if ((await runRobotBusiness(e, "emails.claim", args, emailClaimDecoder(args.emailId ?? NaN), next, feedback).catch(async () => {
		await sendMiddlewareReply(e, {
			title: "领取邮件",
			heading: "",
			text: "领取结果未获完整确认，请先查看邮件状态",
			buttons: [],
			advice: emailRecoveryTips("emails.claim", "领取未确认")
		});
		return { handled: true };
	})).handled) return;
	await message.send(FormatGui({
		isPrivate,
		bid,
		title: "领取邮件",
		content: Format.createMarkdown().addText("领取成功！物品已添加到背包"),
		footer: [{
			label: "返回邮件列表",
			command: "/我的邮件"
		}, {
			label: "储物袋",
			command: "/储物袋"
		}]
	}));
});

//#endregion
export { res_default as default };