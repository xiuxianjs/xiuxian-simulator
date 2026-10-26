import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseBackendFeedbackDetail } from "../../../api/bot/queries.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { formatFeedbackInfo, parseFeedbackId } from "../../../api/bot/feedback-robot.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/feedbacks/feedbackInfo/res.ts
/**
* 查看反馈功能
* 根据反馈ID查询反馈详细信息
* 指令格式：/查看反馈 [反馈信息id]
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const renderFailure = async (reply) => {
		const content = Format.createMarkdown().addText(reply.text);
		for (const button of reply.buttons) {
			content.addText(" ");
			content.addButton(markdownButtonLabel(button.label), { data: button.command });
		}
		if (reply.buttons.length) content.addNewline();
		await message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: "查看反馈",
			content
		}));
	};
	try {
		const messageText = e.MessageText;
		const feedbackId = parseFeedbackId(messageText);
		const loaded = await runRobotBusiness(e, "feedback.detail", { feedbackId }, (value) => parseBackendFeedbackDetail(value, feedbackId ?? 0), next, renderFailure);
		if (loaded.handled) return;
		const feedback = loaded.data;
		const formattedMessage = formatFeedbackInfo(feedback);
		const md = Format.createMarkdown();
		md.addText(formattedMessage);
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "查看反馈",
			content: md,
			footer: [{
				label: "我的反馈",
				command: "/我的反馈"
			}, {
				label: "提交反馈",
				command: "/提交反馈"
			}]
		}));
	} catch (error) {
		logger.error("查看反馈失败:", error);
		const md = Format.createMarkdown();
		md.addText("反馈信息\\反馈id 不存在");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "查看反馈",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };